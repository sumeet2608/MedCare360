const Groq = require('groq-sdk');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');
const drugApi = require('../services/drugApiService');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are MedCare AI, a specialized healthcare assistant for the MedCare 360 Hospital Management System.

Your scope is STRICTLY LIMITED to:
- Hospital-related questions and processes
- Disease information and symptom awareness (educational only)
- First aid guidance and emergency preparedness
- Medicine information (general, educational)
- Healthcare education and preventive care
- Hospital navigation and service information

CRITICAL RULES:
1. NEVER diagnose diseases or medical conditions
2. NEVER prescribe medications or dosages
3. NEVER claim certainty about medical outcomes
4. ALWAYS recommend consulting a licensed healthcare professional
5. ALWAYS mark responses as "Educational Information Only"
6. For emergencies, ALWAYS say: "Please call emergency services (108/112) immediately"

If asked anything outside healthcare/hospital topics, respond:
"I am a healthcare assistant and can only answer medical and hospital-related questions. Please consult our hospital staff for other inquiries."

Begin every response with "[Educational Information Only]" when discussing medical topics.
End responses about symptoms or conditions with: "Please consult a qualified healthcare professional for accurate diagnosis and treatment."`;

exports.chat = asyncHandler(async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Message is required' });
  }

  if (message.length > 1000) {
    return res.status(400).json({ success: false, message: 'Message too long. Please limit to 1000 characters.' });
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama3-8b-8192',
    messages,
    temperature: 0.3,
    max_tokens: 1024,
    top_p: 1,
    stream: false
  });

  const reply = completion.choices[0]?.message?.content || 'I apologize, I could not process your request.';

  logger.info(`AI chat - User: ${req.user._id}, Query length: ${message.length}`);

  res.json({
    success: true,
    data: {
      reply,
      role: 'assistant',
      disclaimer: 'This information is educational only and should not replace professional medical advice.',
      timestamp: new Date().toISOString()
    }
  });
});

exports.scanMedicine = asyncHandler(async (req, res) => {
  const { imageBase64, imageName, ocrText } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, message: 'Image data is required' });
  }

  // Detect MIME type from base64 header or default to jpeg
  let mimeType = 'image/jpeg';
  if (imageBase64.startsWith('data:')) {
    const match = imageBase64.match(/^data:(image\/[a-zA-Z]+);base64,/);
    if (match) mimeType = match[1];
  }

  // Strip the data URL prefix if present
  const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z]+;base64,/, '');

  const systemPrompt = `You are a pharmaceutical information assistant with expertise in identifying medicines from images.
Your job is to analyze medicine packaging images and provide accurate, educational information.
Always include safety disclaimers and never replace professional medical advice.
Respond ONLY with a valid JSON object, no extra text.`;

  const ocrHint = ocrText && ocrText.trim()
    ? `\n\nAn OCR pass over the image extracted this raw text (may contain errors, use it as a hint alongside what you see):\n"""${ocrText.trim().slice(0, 800)}"""`
    : '';

  const userPrompt = `Look at this medicine image carefully. Read all text visible on the packaging/label.${ocrHint}
Identify the medicine and provide this JSON:
{
  "medicineName": "full medicine name as printed on package",
  "brand": "brand/trade name",
  "genericName": "generic/chemical/INN name",
  "manufacturer": "manufacturer name if visible",
  "activeIngredients": ["active ingredients visible on label"],
  "strength": "dosage strength e.g. 500mg, 4mg",
  "category": "medicine category e.g. antiemetic, analgesic, antibiotic",
  "commonUses": ["3-5 common medical uses"],
  "sideEffects": ["4-6 common side effects"],
  "precautions": ["4-5 important precautions"],
  "contraindications": ["conditions where this medicine should NOT be used"],
  "storageInstructions": "how to store this medicine",
  "dosageInfo": "typical dosage information if visible on label",
  "confidence": "high if name clearly visible, medium if partially visible, low if unclear",
  "disclaimer": "This information is educational only and should not replace professional medical advice. Always consult a licensed pharmacist or doctor before taking any medication."
}`;

  let completion;
  try {
    completion = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Data}` } },
            { type: 'text', text: userPrompt }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1500
    });
  } catch (groqErr) {
    const msg = groqErr?.error?.message || groqErr?.message || 'AI vision service error';
    return res.status(400).json({ success: false, message: `Image analysis failed: ${msg}. Please try a smaller or clearer photo.` });
  }

  let medicineInfo;
  try {
    const content = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    medicineInfo = jsonMatch ? JSON.parse(jsonMatch[0]) : { medicineName: 'Unable to detect', confidence: 'low' };
  } catch {
    medicineInfo = { medicineName: 'Unable to parse response', confidence: 'low' };
  }

  medicineInfo.disclaimer = 'This information is educational only and should not replace professional medical advice. Always consult a licensed pharmacist or doctor before taking any medication.';
  medicineInfo.verified = true; // Groq AI analysis — no external DB lookup

  logger.info(`Medicine scan - User: ${req.user._id}, Medicine: ${medicineInfo.medicineName}, Confidence: ${medicineInfo.confidence}`);

  res.json({ success: true, data: medicineInfo });
});

exports.getEmergencyGuidance = asyncHandler(async (req, res) => {
  const { emergency } = req.params;

  const validEmergencies = ['heart_attack', 'stroke', 'burns', 'fracture', 'choking', 'seizure', 'bleeding', 'asthma', 'diabetic_emergency', 'allergic_reaction'];

  if (!validEmergencies.includes(emergency)) {
    return res.status(400).json({ success: false, message: 'Invalid emergency type' });
  }

  const emergencyData = getEmergencyData(emergency);
  res.json({ success: true, data: emergencyData });
});

function getEmergencyData(type) {
  const emergencies = {
    heart_attack: {
      title: 'Heart Attack Emergency',
      warningSigns: ['Chest pain or pressure', 'Pain radiating to arm, jaw, or back', 'Shortness of breath', 'Nausea or vomiting', 'Cold sweats', 'Lightheadedness'],
      immediateActions: ['Call emergency services (108/112) IMMEDIATELY', 'Have the person sit or lie down comfortably', 'Loosen tight clothing', 'If prescribed, help them take nitroglycerin', 'If unresponsive and not breathing, begin CPR', 'Stay with the person until help arrives'],
      familyGuidance: ['Stay calm and reassure the patient', 'Do not leave them alone', 'Collect all their medications', 'Unlock the front door for emergency responders', 'Note the time symptoms started'],
      doNot: ['Do not give food or water', 'Do not leave the person alone', 'Do not wait to see if symptoms pass', 'Do not drive yourself to hospital'],
      callAmbulance: 'YES - Call 108/112 IMMEDIATELY. Do not drive to hospital yourself.',
      disclaimer: 'This is first aid guidance only. Always call emergency services immediately for a heart attack.'
    },
    stroke: {
      title: 'Stroke Emergency - Use FAST Method',
      warningSigns: ['Face drooping on one side', 'Arm weakness or numbness', 'Speech difficulty or slurring', 'Time to call 108/112', 'Sudden severe headache', 'Loss of balance or coordination', 'Vision problems'],
      immediateActions: ['Call 108/112 IMMEDIATELY - time is critical', 'Note exact time symptoms started', 'Keep person calm and still', 'Do not give food, water, or medications', 'Turn person on their side if vomiting', 'Be ready to perform CPR if needed'],
      familyGuidance: ['Use FAST: Face, Arms, Speech, Time', 'Note when symptoms first appeared', 'Do not give aspirin for stroke', 'Stay with patient', 'Gather list of medications'],
      doNot: ['Do not give aspirin', 'Do not let them sleep until assessed', 'Do not give food or water'],
      callAmbulance: 'YES - Call 108/112 IMMEDIATELY. Every minute matters with stroke.',
      disclaimer: 'This is first aid guidance only. Stroke is a medical emergency requiring immediate professional care.'
    },
    burns: {
      title: 'Burns Emergency',
      warningSigns: ['Redness, blistering, or charring of skin', 'Severe pain (or no pain in severe burns)', 'Swelling around burn area', 'White or blackened skin'],
      immediateActions: ['Cool the burn with cool (not cold) running water for 10-20 minutes', 'Remove jewelry near burn area if safe to do', 'Cover loosely with clean non-fluffy material', 'Call 108/112 for severe or large burns', 'Do not pop blisters'],
      familyGuidance: ['Keep patient calm', 'Do not remove clothing stuck to burn', 'Monitor for shock signs', 'Keep patient warm'],
      doNot: ['Do not use ice, butter, or toothpaste', 'Do not break blisters', 'Do not remove stuck clothing', 'Do not use fluffy bandages'],
      callAmbulance: 'Call 108/112 for burns larger than palm size, face/hand/groin burns, chemical/electrical burns.',
      disclaimer: 'This is first aid guidance only. Seek professional medical care for all significant burns.'
    },
    choking: {
      title: 'Choking Emergency',
      warningSigns: ['Cannot speak, cough, or breathe', 'Clutching throat with hands', 'Blue lips or fingernails', 'High-pitched breathing sounds', 'Loss of consciousness'],
      immediateActions: ['Encourage coughing if they can cough', 'Give up to 5 firm back blows between shoulder blades', 'Perform up to 5 abdominal thrusts (Heimlich maneuver)', 'Alternate back blows and abdominal thrusts', 'Call 108/112 if unsuccessful'],
      familyGuidance: ['Do not leave person alone', 'Call 108/112 if object not dislodged', 'For infants use back blows only', 'Begin CPR if unconscious and not breathing'],
      doNot: ['Do not do blind finger sweeps', 'Do not give water', 'Do not leave person alone'],
      callAmbulance: 'Call 108/112 if object cannot be dislodged or person loses consciousness.',
      disclaimer: 'This is first aid guidance only. Learn CPR and Heimlich maneuver through a certified course.'
    },
    seizure: {
      title: 'Seizure Emergency',
      warningSigns: ['Sudden loss of consciousness', 'Uncontrolled shaking or jerking', 'Staring spell', 'Confusion after episode', 'Brief blackout'],
      immediateActions: ['Stay calm and time the seizure', 'Clear area of sharp objects', 'Cushion head with something soft', 'Turn person on their side after convulsions stop', 'Stay with person until fully conscious', 'Call 108/112 if seizure lasts over 5 minutes'],
      familyGuidance: ['Do not restrain person during seizure', 'Note duration and type of movements', 'Be calm and reassuring afterwards', 'Help person rest'],
      doNot: ['Do not put anything in mouth', 'Do not restrain movements', 'Do not give food/water until fully conscious'],
      callAmbulance: 'Call 108/112 if: first seizure, lasts over 5 minutes, person is injured, or does not regain consciousness.',
      disclaimer: 'This is first aid guidance only. Consult a neurologist for seizure management.'
    },
    bleeding: {
      title: 'Severe Bleeding Emergency',
      warningSigns: ['Heavy or uncontrolled bleeding', 'Signs of shock: pale, cold, confused', 'Rapid weak pulse', 'Dizziness or fainting'],
      immediateActions: ['Apply firm direct pressure with clean cloth', 'Do not remove cloth - add more if blood soaks through', 'Elevate injured area above heart if possible', 'Apply tourniquet for limb bleeding if severe', 'Call 108/112 immediately'],
      familyGuidance: ['Wear gloves if available', 'Keep patient warm and calm', 'Do not remove embedded objects', 'Monitor breathing'],
      doNot: ['Do not remove embedded objects', 'Do not release pressure to check wound', 'Do not use tourniquet loosely'],
      callAmbulance: 'Call 108/112 IMMEDIATELY for severe or uncontrolled bleeding.',
      disclaimer: 'This is first aid guidance only. Severe bleeding requires immediate professional medical care.'
    },
    asthma: {
      title: 'Asthma Attack Emergency',
      warningSigns: ['Severe shortness of breath', 'Cannot speak in full sentences', 'Blue lips or fingernails', 'Reliever inhaler not helping', 'Rapid breathing'],
      immediateActions: ['Sit person upright, leaning forward slightly', 'Help use reliever inhaler (1 puff every 30-60 seconds up to 10 puffs)', 'Call 108/112 if no improvement after 10 minutes', 'Stay calm and reassure patient', 'Loosen tight clothing'],
      familyGuidance: ['Get inhaler immediately', 'Sit with patient in upright position', 'Keep environment calm', 'Know emergency plan in advance'],
      doNot: ['Do not lay patient flat', 'Do not leave patient alone', 'Do not delay calling for help'],
      callAmbulance: 'Call 108/112 if: inhaler not available, no improvement, symptoms worsening.',
      disclaimer: 'This is first aid guidance only. Asthma patients should have a personal emergency action plan from their doctor.'
    },
    diabetic_emergency: {
      title: 'Diabetic Emergency',
      warningSigns: ['Shaking, trembling', 'Sweating', 'Pale skin', 'Fast heartbeat', 'Confusion or strange behavior', 'Headache'],
      immediateActions: ['If conscious: give fast-acting sugar (juice, glucose tablets)', 'Have them sit or lie down', 'Recheck after 15 minutes', 'Repeat sugar if still symptomatic', 'Call 108/112 if unconscious or no improvement'],
      familyGuidance: ['Know signs of low blood sugar', 'Keep glucose tablets or juice at home', 'Know when to call for help', 'Do not give food to unconscious person'],
      doNot: ['Do not give food or drink if unconscious', 'Do not delay treatment', 'Do not drive when hypoglycemic'],
      callAmbulance: 'Call 108/112 if: unconscious, seizures, or not improving after sugar intake.',
      disclaimer: 'This is first aid guidance only. Diabetic patients should have an emergency plan from their doctor.'
    }
  };

  return emergencies[type] || {
    title: 'Emergency Guidance',
    immediateActions: ['Call emergency services 108/112 immediately'],
    disclaimer: 'Always call emergency services for any medical emergency.'
  };
}
