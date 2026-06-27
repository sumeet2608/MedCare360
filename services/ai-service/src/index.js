'use strict';
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3010;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost', port: 6379 });
app.use(express.json());

// ── System prompts ────────────────────────────────────────────
const MEDICAL_SYSTEM = `You are MedCare AI, a professional medical information assistant for hospital staff and patients.
You only answer medical, health, and hospital-related questions.
For emergencies, always advise calling emergency services (112/911).
Never diagnose or prescribe — provide general information only.
Be concise, accurate, and compassionate.`;

const SYMPTOM_CHECKER_SYSTEM = `You are a medical symptom analysis assistant.
Analyze the patient's described symptoms and provide:
1. Possible conditions (list 3-5, ranked by likelihood)
2. Urgency level (Emergency/Urgent/Non-urgent)
3. Recommended actions
4. Red flag symptoms to watch for
Always recommend professional medical consultation. Never provide a definitive diagnosis.`;

const DRUG_INTERACTION_SYSTEM = `You are a pharmaceutical drug interaction checker.
For the given medications, provide:
1. Interaction severity (None/Minor/Moderate/Major/Contraindicated)
2. Mechanism of interaction
3. Clinical effects
4. Management recommendations
5. Alternative medications if needed
Base on established pharmacological evidence.`;

// ── POST /api/ai/chat ─────────────────────────────────────────
app.post('/api/ai/chat', async (req, res) => {
  const { message, history = [], sessionId } = req.body;

  // Cache key for same-session repeated questions
  const cacheKey = `ai:chat:${sessionId}:${Buffer.from(message).toString('base64').slice(0, 32)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, data: { reply: cached, cached: true } });

  try {
    const messages = [
      { role: 'system', content: MEDICAL_SYSTEM },
      ...history.slice(-10),
      { role: 'user', content: message }
    ];

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.3
    });

    const reply = completion.choices[0].message.content;
    await redis.set(cacheKey, reply, 'EX', 300); // 5 min cache
    res.json({ success: true, data: { reply } });
  } catch (err) {
    logger.error('AI chat error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

// ── POST /api/ai/symptom-check ────────────────────────────────
app.post('/api/ai/symptom-check', async (req, res) => {
  const { symptoms, age, gender, medicalHistory = [] } = req.body;
  try {
    const prompt = `Patient Profile: Age ${age}, Gender: ${gender}
Medical History: ${medicalHistory.join(', ') || 'None'}
Current Symptoms: ${symptoms}

Provide structured symptom analysis.`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYMPTOM_CHECKER_SYSTEM },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.2
    });

    res.json({ success: true, data: { analysis: completion.choices[0].message.content } });
  } catch (err) {
    logger.error('Symptom check error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

// ── POST /api/ai/drug-interaction ─────────────────────────────
app.post('/api/ai/drug-interaction', async (req, res) => {
  const { medications, patientInfo = {} } = req.body;
  if (!medications || medications.length < 2)
    return res.status(400).json({ success: false, message: 'At least 2 medications required' });

  try {
    const prompt = `Check interactions for: ${medications.join(', ')}
Patient: ${patientInfo.age ? `Age ${patientInfo.age}` : ''} ${patientInfo.conditions ? `Conditions: ${patientInfo.conditions}` : ''}`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: DRUG_INTERACTION_SYSTEM },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.1
    });

    res.json({ success: true, data: { interactions: completion.choices[0].message.content } });
  } catch (err) {
    logger.error('Drug interaction error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

// ── POST /api/ai/scan-medicine ────────────────────────────────
app.post('/api/ai/scan-medicine', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' });

  try {
    const imageData = fs.readFileSync(req.file.path);
    const base64Image = imageData.toString('base64');
    const mimeType = req.file.mimetype;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_VISION_MODEL || 'llava-v1.5-7b-4096-preview',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
          { type: 'text', text: `Analyze this medicine image/label and return a JSON object with these exact fields:
{
  "medicineName": "",
  "genericName": "",
  "composition": "",
  "uses": [],
  "sideEffects": [],
  "contraindications": [],
  "pregnancyWarning": "",
  "foodInteractions": [],
  "alcoholInteraction": "",
  "storageConditions": "",
  "dosage": "",
  "manufacturer": ""
}
Return ONLY valid JSON. If any field is not visible, use empty string or empty array.` }
        ]
      }],
      max_tokens: 2000
    });

    fs.unlinkSync(req.file.path); // Clean up temp file

    let result;
    try {
      const content = completion.choices[0].message.content;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      result = { raw: completion.choices[0].message.content };
    }

    res.json({ success: true, data: result });
  } catch (err) {
    if (req.file?.path) fs.unlinkSync(req.file.path).catch(() => {});
    logger.error('Medicine scan error', err);
    res.status(500).json({ success: false, message: 'Failed to analyze medicine image' });
  }
});

// ── POST /api/ai/emergency ────────────────────────────────────
app.post('/api/ai/emergency', async (req, res) => {
  const { type, step = 1, patientAge, additionalInfo = '' } = req.body;
  const emergencyTypes = {
    'heart-attack': 'Provide step-by-step first aid for a heart attack.',
    'stroke': 'Provide step-by-step first aid for a stroke. Use FAST (Face, Arms, Speech, Time).',
    'choking': 'Provide step-by-step instructions for choking — adult and child.',
    'burns': 'Provide step-by-step first aid for burns (minor, major, chemical).',
    'seizures': 'Provide step-by-step first aid for seizures/epileptic fits.',
    'poisoning': 'Provide step-by-step first aid for poisoning/overdose.',
    'asthma': 'Provide step-by-step first aid for a severe asthma attack.',
    'bleeding': 'Provide step-by-step first aid for severe bleeding/hemorrhage.',
    'snake-bite': 'Provide step-by-step first aid for a snake bite.',
    'electric-shock': 'Provide step-by-step first aid for electric shock.'
  };

  const prompt = emergencyTypes[type] || `Provide emergency first aid for: ${type}`;

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{
        role: 'system',
        content: 'You are an emergency medical first aid guide. Provide clear, numbered step-by-step instructions that a layperson can follow immediately. Always tell them to call emergency services (112) first. Keep instructions brief, clear, and actionable.'
      }, {
        role: 'user',
        content: `${prompt}
Patient age: ${patientAge || 'unknown'}. Step ${step} requested.
Additional info: ${additionalInfo}
Format: numbered steps, urgent action items in CAPS.`
      }],
      max_tokens: 1500,
      temperature: 0.1
    });

    res.json({ success: true, data: { steps: completion.choices[0].message.content, emergencyType: type } });
  } catch (err) {
    logger.error('Emergency guide error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

// ── POST /api/ai/insights ─────────────────────────────────────
app.post('/api/ai/insights', async (req, res) => {
  const { hospitalData } = req.body;
  const cacheKey = `ai:insights:${JSON.stringify(hospitalData).slice(0, 50)}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ success: true, data: { insights: cached } });

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{
        role: 'system',
        content: 'You are a healthcare analytics AI. Analyze hospital operational data and provide 3-5 actionable insights. Be specific and data-driven.'
      }, {
        role: 'user',
        content: `Hospital Data: ${JSON.stringify(hospitalData, null, 2)}\n\nProvide operational insights and recommendations.`
      }],
      max_tokens: 1000,
      temperature: 0.4
    });

    const insights = completion.choices[0].message.content;
    await redis.set(cacheKey, insights, 'EX', 3600); // 1hr cache
    res.json({ success: true, data: { insights } });
  } catch (err) {
    logger.error('Insights error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

// ── POST /api/ai/preventive-care ──────────────────────────────
app.post('/api/ai/preventive-care', async (req, res) => {
  const { age, gender, conditions, lifestyle } = req.body;
  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{
        role: 'system',
        content: 'You are a preventive care specialist. Provide personalized preventive care recommendations based on patient profile. Cover: screenings, vaccinations, lifestyle changes, diet, exercise.'
      }, {
        role: 'user',
        content: `Patient: Age ${age}, Gender: ${gender}\nConditions: ${conditions?.join(', ') || 'None'}\nLifestyle: ${JSON.stringify(lifestyle || {})}\n\nProvide personalized preventive care plan.`
      }],
      max_tokens: 1500,
      temperature: 0.3
    });
    res.json({ success: true, data: { recommendations: completion.choices[0].message.content } });
  } catch (err) {
    logger.error('Preventive care error', err);
    res.status(500).json({ success: false, message: 'AI service unavailable' });
  }
});

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'ai-service' }));

app.listen(PORT, () => logger.info(`AI Service on port ${PORT}`));
module.exports = app;
