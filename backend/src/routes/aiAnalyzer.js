'use strict';
/**
 * MedCare360 AI Lab Analyzer — Enterprise Clinical Engine v3.0
 * Phases 1+2: Gender/age/pregnancy-specific reference ranges + full AI explainability
 */
const router = require('express').Router();
const Groq = require('groq-sdk');
const { protect } = require('../middleware/auth');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
router.use(protect);

// ── Gender/Age-aware reference ranges ────────────────────────────────────────
// Each param has: adult (m/f), child, elderly, pregnancy where clinically different
const REFS = {
  // CBC
  hemoglobin: {
    adult_male:    { low: 13.5, high: 17.5, critLow: 7.0,  critHigh: 20.0, unit: 'g/dL', range: '13.5–17.5' },
    adult_female:  { low: 12.0, high: 15.5, critLow: 7.0,  critHigh: 20.0, unit: 'g/dL', range: '12.0–15.5' },
    child:         { low: 11.5, high: 15.5, critLow: 7.0,  critHigh: 20.0, unit: 'g/dL', range: '11.5–15.5' },
    elderly:       { low: 11.5, high: 17.0, critLow: 7.0,  critHigh: 20.0, unit: 'g/dL', range: '11.5–17.0' },
    pregnancy:     { low: 11.0, high: 14.0, critLow: 7.0,  critHigh: 20.0, unit: 'g/dL', range: '11.0–14.0 (pregnancy)' }
  },
  hematocrit: {
    adult_male:    { low: 41, high: 53, critLow: 21, critHigh: 60, unit: '%', range: '41–53' },
    adult_female:  { low: 36, high: 46, critLow: 21, critHigh: 60, unit: '%', range: '36–46' },
    child:         { low: 35, high: 45, critLow: 20, critHigh: 60, unit: '%', range: '35–45' },
    elderly:       { low: 35, high: 50, critLow: 21, critHigh: 60, unit: '%', range: '35–50' },
    pregnancy:     { low: 33, high: 44, critLow: 20, critHigh: 60, unit: '%', range: '33–44 (pregnancy)' }
  },
  rbc: {
    adult_male:    { low: 4.5, high: 5.9, critLow: 2.0, critHigh: 7.0, unit: 'million/μL', range: '4.5–5.9' },
    adult_female:  { low: 4.0, high: 5.2, critLow: 2.0, critHigh: 7.0, unit: 'million/μL', range: '4.0–5.2' },
    child:         { low: 3.8, high: 5.2, critLow: 2.0, critHigh: 7.0, unit: 'million/μL', range: '3.8–5.2' },
    elderly:       { low: 3.8, high: 5.8, critLow: 2.0, critHigh: 7.0, unit: 'million/μL', range: '3.8–5.8' },
    pregnancy:     { low: 3.5, high: 5.0, critLow: 2.0, critHigh: 7.0, unit: 'million/μL', range: '3.5–5.0 (pregnancy)' }
  },
  wbc: {
    adult_male:    { low: 4500, high: 11000, critLow: 2000, critHigh: 30000, unit: 'cells/μL', range: '4,500–11,000' },
    adult_female:  { low: 4500, high: 11000, critLow: 2000, critHigh: 30000, unit: 'cells/μL', range: '4,500–11,000' },
    child:         { low: 5000, high: 14500, critLow: 2000, critHigh: 30000, unit: 'cells/μL', range: '5,000–14,500' },
    elderly:       { low: 4500, high: 11000, critLow: 2000, critHigh: 30000, unit: 'cells/μL', range: '4,500–11,000' },
    pregnancy:     { low: 6000, high: 16000, critLow: 2000, critHigh: 30000, unit: 'cells/μL', range: '6,000–16,000 (pregnancy)' }
  },
  platelets: {
    all:           { low: 150, high: 400, critLow: 50, critHigh: 1000, unit: 'K/μL', range: '150–400' },
    pregnancy:     { low: 115, high: 400, critLow: 50, critHigh: 1000, unit: 'K/μL', range: '115–400 (pregnancy)' }
  },
  mcv:         { all: { low: 80, high: 100, unit: 'fL', range: '80–100' } },
  mch:         { all: { low: 27, high: 33,  unit: 'pg', range: '27–33' } },
  mchc:        { all: { low: 32, high: 36,  unit: 'g/dL', range: '32–36' } },
  neutrophils: { all: { low: 50, high: 70,  unit: '%', range: '50–70' } },
  lymphocytes: { all: { low: 20, high: 40,  unit: '%', range: '20–40' } },
  // Lipid
  totalCholesterol: { all: { high: 200, unit: 'mg/dL', range: '<200 desirable, 200–239 borderline, ≥240 high' } },
  ldl: {
    adult_male:   { high: 130, unit: 'mg/dL', range: '<100 optimal, 100–129 near-optimal, 130–159 borderline, ≥160 high' },
    adult_female: { high: 130, unit: 'mg/dL', range: '<100 optimal, 100–129 near-optimal, 130–159 borderline, ≥160 high' },
    all:          { high: 130, unit: 'mg/dL', range: '<100 optimal, 130–159 borderline, ≥160 high' }
  },
  hdl: {
    adult_male:   { low: 40, unit: 'mg/dL', range: '>40 (low risk >60)' },
    adult_female: { low: 50, unit: 'mg/dL', range: '>50 (low risk >60)' },
    child:        { low: 40, unit: 'mg/dL', range: '>40' },
    all:          { low: 40, unit: 'mg/dL', range: '>40 male / >50 female' }
  },
  triglycerides: { all: { high: 150, unit: 'mg/dL', range: '<150 normal, 150–199 borderline, 200–499 high, ≥500 very high (pancreatitis risk)' } },
  nonHdl:        { all: { high: 130, unit: 'mg/dL', range: '<130 optimal (not flagged mild until ≥131)' } },
  vldl:          { all: { low: 2, high: 30,  unit: 'mg/dL', range: '2–30' } },
  // LFT
  alt: {
    adult_male:   { high: 56, critHigh: 500, unit: 'U/L', range: '7–56' },
    adult_female: { high: 45, critHigh: 500, unit: 'U/L', range: '7–45' },
    child:        { high: 45, critHigh: 500, unit: 'U/L', range: '5–45' },
    all:          { high: 56, critHigh: 500, unit: 'U/L', range: '7–56 (male), 7–45 (female)' }
  },
  ast: {
    adult_male:   { high: 40, critHigh: 500, unit: 'U/L', range: '10–40' },
    adult_female: { high: 35, critHigh: 500, unit: 'U/L', range: '10–35' },
    child:        { high: 40, critHigh: 500, unit: 'U/L', range: '10–40' },
    all:          { high: 40, critHigh: 500, unit: 'U/L', range: '10–40' }
  },
  alp: {
    adult_male:   { high: 147, unit: 'U/L', range: '44–147' },
    adult_female: { high: 147, unit: 'U/L', range: '44–147' },
    child:        { high: 350, unit: 'U/L', range: 'up to 350 (growing bone)' },
    pregnancy:    { high: 240, unit: 'U/L', range: 'up to 2–3× normal (placental ALP)' },
    all:          { high: 147, unit: 'U/L', range: '44–147' }
  },
  ggt: {
    adult_male:   { high: 61, unit: 'U/L', range: '8–61' },
    adult_female: { high: 36, unit: 'U/L', range: '5–36' },
    all:          { high: 61, unit: 'U/L', range: '8–61 (male), 5–36 (female)' }
  },
  bilirubin:    { all: { high: 1.2, critHigh: 15,  unit: 'mg/dL', range: '0.1–1.2' } },
  directBilirubin: { all: { high: 0.3, unit: 'mg/dL', range: '0.0–0.3' } },
  albumin:      { all: { low: 3.5, high: 5.0, unit: 'g/dL', range: '3.5–5.0' } },
  totalProtein: { all: { low: 6.3, high: 8.2, unit: 'g/dL', range: '6.3–8.2' } },
  pt:           { all: { low: 11, high: 13.5, critHigh: 30, unit: 'seconds', range: '11–13.5' } },
  // KFT
  creatinine: {
    adult_male:   { high: 1.3, critHigh: 10, unit: 'mg/dL', range: '0.7–1.3' },
    adult_female: { high: 1.1, critHigh: 10, unit: 'mg/dL', range: '0.6–1.1' },
    child:        { high: 0.8, critHigh: 10, unit: 'mg/dL', range: '0.3–0.8' },
    elderly:      { high: 1.3, critHigh: 10, unit: 'mg/dL', range: '0.7–1.3' },
    all:          { high: 1.3, critHigh: 10, unit: 'mg/dL', range: '0.7–1.3 (male), 0.6–1.1 (female)' }
  },
  bun:       { all: { low: 7, high: 20, critHigh: 100, unit: 'mg/dL', range: '7–20' } },
  uricAcid: {
    adult_male:   { high: 7.0, unit: 'mg/dL', range: '3.4–7.0' },
    adult_female: { high: 6.0, unit: 'mg/dL', range: '2.4–6.0' },
    all:          { high: 7.0, unit: 'mg/dL', range: '3.4–7.0 (male), 2.4–6.0 (female)' }
  },
  gfr:          { all: { low: 60, unit: 'mL/min/1.73m²', range: '≥90 G1, 60–89 G2, 30–59 G3, 15–29 G4, <15 G5 ESRD' } },
  sodium:       { all: { low: 136, high: 145, critLow: 120, critHigh: 160, unit: 'mEq/L', range: '136–145' } },
  potassium:    { all: { low: 3.5, high: 5.0, critLow: 2.5, critHigh: 6.5,  unit: 'mEq/L', range: '3.5–5.0' } },
  chloride:     { all: { low: 98,  high: 107, unit: 'mEq/L', range: '98–107' } },
  bicarbonate:  { all: { low: 22,  high: 29,  unit: 'mEq/L', range: '22–29' } },
  calcium:      { all: { low: 8.5, high: 10.5, critLow: 6.5, critHigh: 13.5, unit: 'mg/dL', range: '8.5–10.5' } },
  phosphorus:   { all: { low: 2.5, high: 4.5, unit: 'mg/dL', range: '2.5–4.5' } },
  // Diabetes
  fastingGlucose: { all: { high: 99, critLow: 40, critHigh: 500, unit: 'mg/dL', range: '<100 normal, 100–125 prediabetes, ≥126 diabetes' } },
  hba1c:          { all: { high: 5.6, unit: '%', range: '<5.7 normal, 5.7–6.4 prediabetes, ≥6.5 diabetes, ≥8.0 poor control' } },
  ppGlucose:      { all: { high: 139, unit: 'mg/dL', range: '<140 normal, 140–199 prediabetes, ≥200 diabetes' } },
  insulin:        { all: { low: 2, high: 25, unit: 'μIU/mL', range: '2–25 fasting' } },
  cPeptide:       { all: { low: 0.5, high: 2.0, unit: 'ng/mL', range: '0.5–2.0' } },
  microalbumin:   { all: { high: 30, unit: 'mg/g', range: '<30 normal, 30–300 microalbuminuria, >300 macroalbuminuria' } },
  // Thyroid
  tsh:    { all: { low: 0.4, high: 4.0, critLow: 0.01, critHigh: 100, unit: 'mIU/L', range: '0.4–4.0' }, pregnancy: { low: 0.1, high: 2.5, unit: 'mIU/L', range: '0.1–2.5 (1st trimester pregnancy)' } },
  freeT3: { all: { low: 2.3, high: 4.1, unit: 'pg/mL', range: '2.3–4.1' } },
  freeT4: { all: { low: 0.8, high: 1.8, unit: 'ng/dL',  range: '0.8–1.8' } },
  antiTPO:{ all: { high: 35,  unit: 'IU/mL', range: '<35 (≥35 = autoimmune thyroid disease)' } },
  antiTg: { all: { high: 20,  unit: 'IU/mL', range: '<20' } }
};

// ── Get gender/age-appropriate reference for a parameter ─────────────────────
function getRef(param, gender, age, isPregnant) {
  const refs = REFS[param];
  if (!refs) return null;
  if (isPregnant && refs.pregnancy) return refs.pregnancy;
  if (refs.all) {
    // For gender-specific params embedded in 'all', the range text explains both
    const r = { ...refs.all };
    // Override low/high for known gender-specific params
    if (param === 'hdl' && gender === 'female') r.low = 50;
    if (param === 'creatinine' && gender === 'female') { r.high = 1.1; r.range = '0.6–1.1 (female)'; }
    if (param === 'uricAcid' && gender === 'female') { r.high = 6.0; r.range = '2.4–6.0 (female)'; }
    if (param === 'ggt' && gender === 'female') { r.high = 36; r.range = '5–36 (female)'; }
    if (param === 'alt' && gender === 'female') { r.high = 45; r.range = '7–45 (female)'; }
    if (param === 'ast' && gender === 'female') { r.high = 35; r.range = '10–35 (female)'; }
    return r;
  }
  const ageGroup = age && age < 18 ? 'child' : age && age >= 65 ? 'elderly' : gender === 'female' ? 'adult_female' : 'adult_male';
  return refs[ageGroup] || refs.adult_male || refs.adult_female || null;
}

// ── Deterministic critical value detection ────────────────────────────────────
function identifyCriticalValues(type, values, gender, age, isPregnant) {
  const critical = [];
  for (const [key, val] of Object.entries(values)) {
    if (typeof val !== 'number') continue;
    const ref = getRef(key, gender, age, isPregnant);
    if (!ref) continue;
    if (ref.critLow !== undefined && val < ref.critLow)
      critical.push({ parameter: key, value: val, unit: ref.unit, severity: 'CRITICAL LOW', normalRange: ref.range });
    else if (ref.critHigh !== undefined && val > ref.critHigh)
      critical.push({ parameter: key, value: val, unit: ref.unit, severity: 'CRITICAL HIGH', normalRange: ref.range });
  }
  return critical;
}

// ── Deterministic severity correction (AI can't override known ranges) ────────
function correctFindingSeverities(findings, values, gender, age, isPregnant) {
  if (!Array.isArray(findings)) return findings;
  return findings.map(f => {
    const key = Object.keys(REFS).find(k => k.toLowerCase() === (f.parameter || '').toLowerCase());
    if (!key) return f;
    const ref = getRef(key, gender, age, isPregnant);
    if (!ref) return f;
    const val = typeof values[key] === 'number' ? values[key] : Number(values[key]);
    if (isNaN(val)) return f;
    const tooLow  = ref.low  !== undefined && val < ref.low;
    const tooHigh = ref.high !== undefined && val > ref.high;
    if (!tooLow && !tooHigh) {
      return { ...f, severity: 'normal', normalRange: ref.range,
               interpretation: f.interpretation && f.severity !== 'normal'
                 ? f.interpretation : 'Within normal limits' };
    }
    const deviation = tooLow ? (ref.low - val) / ref.low : (val - ref.high) / ref.high;
    const correctSev = deviation < 0.10 ? 'mild' : deviation < 0.25 ? 'moderate' : 'severe';
    return { ...f, severity: correctSev, normalRange: ref.range };
  });
}

// ── Normalize urgentFlags and recommendations to string[] ─────────────────────
function normalizeArrays(analysis) {
  const toStr = arr => !Array.isArray(arr) ? [] : arr.map(i =>
    typeof i === 'string' ? i :
    i?.flag || i?.message || i?.text || i?.action || i?.recommendation ||
    (i?.parameter && i?.interpretation ? `${i.parameter}: ${i.interpretation}` : '') ||
    JSON.stringify(i)
  ).filter(Boolean);
  return { ...analysis, urgentFlags: toStr(analysis.urgentFlags), recommendations: toStr(analysis.recommendations) };
}

// ── System prompt — immutable clinical rules ──────────────────────────────────
const SYSTEM_PROMPT = `You are a board-certified clinical laboratory specialist and senior internist AI with expertise in hematology, endocrinology, hepatology, nephrology, and cardiovascular medicine.

CLINICAL EXPLAINABILITY MANDATE — every single conclusion MUST cite the actual value and threshold:
❌ WRONG: "LDL is elevated"
✅ CORRECT: "LDL is 185 mg/dL which exceeds the high threshold of 160 mg/dL, indicating high cardiovascular risk per ACC/AHA guidelines"

❌ WRONG: "Thrombocytopenia likely"
✅ CORRECT: "Platelet count is 48 K/μL which is below the critical threshold of 50 K/μL, indicating severe thrombocytopenia with spontaneous bleeding risk"

FORMAT RULES (violations break the parser):
- urgentFlags: string[] only — plain text citing actual values
- recommendations: string[] only — plain text with specific interventions
- findings[].severity: exactly "normal" | "mild" | "moderate" | "severe"
- findings[].interpretation: MUST cite the actual value and reference range
- conditions[].reasoning: MUST cite which specific values led to this conclusion
- confidence: integer 0–100

Return ONLY valid JSON. No markdown fences. No extra text before or after {}.`;

// ── Analyzer definitions with elite clinical prompts ─────────────────────────
function buildCBCPrompt(values, ctx, refCtx) {
  return `${ctx}
Patient Values (platelets in K/μL): ${JSON.stringify(values)}
${refCtx}

EXPERT CBC INTERPRETATION — analyze ALL patterns:

ANEMIA CLASSIFICATION (if Hb low):
- Microcytic (MCV <80): Iron deficiency (low MCH + low MCHC + high RDW), Thalassemia (low MCH + normal/high RBC), Sideroblastic, Lead poisoning
- Normocytic (MCV 80–100): Acute blood loss, hemolytic anemia (check MCHC for spherocytosis if >36), aplastic anemia, CKD anemia
- Macrocytic (MCV >100): B12/folate deficiency, liver disease, hypothyroidism, alcohol, drug-induced (hydroxyurea, methotrexate)

WBC DIFFERENTIAL PATTERNS:
- Leukocytosis >11,000: bacterial (neutrophilia >75%), viral (lymphocytosis >45%), eosinophilia >5% (parasites/allergy), leukemia (>30,000 — URGENT)
- Leukopenia <4,500: viral infection, autoimmune, drug-induced, bone marrow suppression
- Left shift (neutrophils >75%): severe bacterial infection/sepsis — URGENT flag

PLATELET ANALYSIS:
- 150–400 K/μL = NORMAL (cite exact value)
- 100–149 K/μL = mild thrombocytopenia (ITP, drug-induced)
- 50–99 K/μL = moderate — significant bleeding risk, avoid surgery
- <50 K/μL = CRITICAL — spontaneous bleeding risk, immediate intervention
- >400 K/μL = thrombocytosis (reactive vs essential)

IRON DEFICIENCY PATTERN: Low MCV + Low MCH + Low MCHC → "Iron deficiency pattern: MCV ${values.mcv || '?'} fL (<80), MCH ${values.mch || '?'} pg (<27), MCHC ${values.mchc || '?'} g/dL (<32)"

EVERY finding interpretation MUST cite the actual patient value and the reference range.

Return JSON:
{
  "findings": [{"parameter":"hemoglobin","value":14.5,"unit":"g/dL","normalRange":"13.5–17.5 (male)","severity":"normal","interpretation":"Hemoglobin is 14.5 g/dL, within the male normal range of 13.5–17.5 g/dL — no anemia"}],
  "conditions": [{"name":"Iron Deficiency Anemia","confidence":85,"reasoning":"MCV is 72 fL (<80 threshold), MCH is 24 pg (<27 threshold), MCHC is 31 g/dL (<32 threshold) — microcytic hypochromic pattern consistent with iron deficiency"}],
  "confidence": 90,
  "urgentFlags": ["WBC 32,000 cells/μL (>30,000 critical threshold) — leukemia cannot be excluded, urgent hematology referral required"],
  "recommendations": ["Serum ferritin and iron studies to confirm iron deficiency — MCV 72 fL and MCH 24 pg suggest iron-limited erythropoiesis"]
}`;
}

function buildLipidPrompt(values, ctx, refCtx) {
  return `${ctx}
Patient Values: ${JSON.stringify(values)}
${refCtx}

ACC/AHA 2019 LIPID EXPERT ANALYSIS:

RISK STRATIFICATION — cite exact values:
- Total Cholesterol ${values.totalCholesterol || '?'}: <200 desirable, 200–239 borderline, ≥240 high
- LDL ${values.ldl || '?'}: <100 optimal, 100–129 near-optimal, 130–159 borderline, 160–189 high, ≥190 very high (Familial Hypercholesterolemia screening)
- HDL ${values.hdl || '?'}: ${values.hdl && values.hdl < 40 ? 'BELOW minimum — major CV risk factor' : values.hdl && values.hdl > 60 ? 'ABOVE 60 — protective factor' : 'acceptable range'}
- Triglycerides ${values.triglycerides || '?'}: <150 normal, ≥500 pancreatitis risk — URGENT
- Non-HDL ${values.nonHdl || '?'}: <130 optimal — ONLY flag as abnormal if ≥131 mg/dL

CALCULATED RATIOS (compute and report):
- Atherogenic Index = (Total Cholesterol - HDL) / HDL — Normal <3.5 male, <3.0 female
- TG/HDL ratio: <2 optimal, >4 = insulin resistance/metabolic syndrome
- LDL/HDL ratio: <2.5 optimal, >3.5 high risk

DYSLIPIDEMIA PATTERNS:
- Pure hypercholesterolemia: Elevated TC + LDL, normal TG
- Hypertriglyceridemia: Elevated TG ± elevated VLDL
- Mixed dyslipidemia: TC + LDL + TG elevated, HDL low → metabolic syndrome pattern
- Familial Hypercholesterolemia: LDL ≥190 → MUST flag, statin + genetic counseling

STATIN THRESHOLDS (ACC/AHA): LDL ≥190 = high-intensity regardless; LDL 70–189 + diabetes = moderate; ASCVD ≥7.5% = initiate

EVERY finding must cite "Value X is Y mg/dL, which [exceeds/is below] the threshold of Z mg/dL"

Return JSON:
{
  "riskLevel": "low|moderate|high|very-high",
  "findings": [{"parameter":"ldl","value":185,"unit":"mg/dL","normalRange":"<160 (high threshold)","severity":"moderate","interpretation":"LDL is 185 mg/dL, which exceeds the borderline-high threshold of 160 mg/dL and approaches the very-high risk cutoff of 190 mg/dL — high cardiovascular risk per ACC/AHA guidelines"}],
  "conditions": [{"name":"Mixed Dyslipidemia","confidence":88,"reasoning":"LDL 185 mg/dL (>160 threshold), Triglycerides 240 mg/dL (>200 high threshold), HDL 38 mg/dL (<40 male minimum) — combined pattern indicates elevated ASCVD risk"}],
  "confidence": 88,
  "urgentFlags": ["Triglycerides 520 mg/dL (>500 threshold) — acute pancreatitis risk, urgent fibrate therapy consideration"],
  "recommendations": ["High-intensity statin therapy indicated — LDL 185 mg/dL exceeds 160 mg/dL threshold; target LDL <70 mg/dL for high-risk patients per ACC/AHA 2019"]
}`;
}

function buildLFTPrompt(values, ctx, refCtx) {
  const altULN = values.alt && values.alt > 0 ? (values.alt / 56).toFixed(1) : '?';
  const alpULN = values.alp && values.alp > 0 ? (values.alp / 147).toFixed(1) : '?';
  const rRatio = (parseFloat(altULN) && parseFloat(alpULN)) ? (parseFloat(altULN) / parseFloat(alpULN)).toFixed(1) : '?';
  const astAltRatio = (values.ast && values.alt) ? (values.ast / values.alt).toFixed(1) : '?';
  return `${ctx}
Patient Values: ${JSON.stringify(values)}
${refCtx}

Pre-computed ratios:
- ALT/ULN = ${altULN}× | ALP/ULN = ${alpULN}× | R-Ratio = ${rRatio} (>5 hepatocellular, <2 cholestatic, 2–5 mixed)
- AST/ALT ratio = ${astAltRatio} (>2 alcoholic liver disease, >3 strongly alcoholic)

EXPERT LFT PATTERN RECOGNITION:
Injury Pattern (cite R-ratio): R>${rRatio}>5 = hepatocellular | R<2 = cholestatic | 2–5 = mixed
Severity (cite ULN multiples): 1–3× = mild | 3–10× = moderate | 10–20× = severe | >20× = acute liver failure risk

SPECIFIC PATTERNS — check and cite:
- Viral Hepatitis: ALT >> AST, typically both >200 U/L
- Alcoholic: AST/ALT ${astAltRatio} ${astAltRatio > 2 ? '> 2 — CONSISTENT WITH ALCOHOLIC PATTERN' : '≤ 2 — NOT consistent with alcoholic pattern'}
- Cholestasis: ALP >2× ULN with elevated GGT (hepatic) or normal GGT (bone/pregnancy)
- Cirrhosis: Low albumin + elevated bilirubin + prolonged PT = synthetic dysfunction
- Acute Liver Failure: ALT/AST >20× ULN + prolonged PT — CRITICAL

EVERY interpretation must state: "[Parameter] is [value] U/L, which is [X]× the upper limit of normal ([ULN] U/L)"

Return JSON with pattern, severity, findings, conditions, confidence, urgentFlags (string[]), recommendations (string[]).`;
}

function buildKFTPrompt(values, ctx, refCtx) {
  const bunCrRatio = (values.bun && values.creatinine) ? (values.bun / values.creatinine).toFixed(1) : '?';
  const gfr = values.gfr;
  const ckdStage = !gfr ? null : gfr >= 90 ? 'G1' : gfr >= 60 ? 'G2' : gfr >= 45 ? 'G3a' : gfr >= 30 ? 'G3b' : gfr >= 15 ? 'G4' : 'G5';
  return `${ctx}
Patient Values: ${JSON.stringify(values)}
${refCtx}

Pre-computed: BUN/Creatinine ratio = ${bunCrRatio} (10–20 normal, >20 pre-renal, <10 intrinsic/hepatic)
eGFR ${gfr} → CKD ${ckdStage || 'stage not calculable'} per KDIGO

EXPERT NEPHROLOGY ANALYSIS:
CKD STAGING (cite eGFR): G1 ≥90, G2 60–89, G3a 45–59, G3b 30–44, G4 15–29, G5 <15 (ESRD)
PRE-RENAL vs INTRINSIC: BUN/Cr ${bunCrRatio} — ${parseFloat(bunCrRatio) > 20 ? '>20: pre-renal azotemia (dehydration/heart failure/sepsis)' : parseFloat(bunCrRatio) < 10 ? '<10: intrinsic renal disease' : '10–20: within normal ratio'}
ELECTROLYTES — cite every abnormal:
- Potassium >6.5 mEq/L = CARDIAC ARRHYTHMIA RISK — EMERGENCY
- Sodium <125 mEq/L = cerebral edema risk — URGENT
- Bicarbonate <18 = significant metabolic acidosis (calculate anion gap if Na/Cl/HCO3 available)
- Calcium <6.5 or >13.5 = cardiac risk — CRITICAL

EVERY interpretation must cite value and threshold.
Return JSON with ckdStage, findings, conditions, confidence, urgentFlags (string[]), recommendations (string[]).`;
}

function buildDiabetesPrompt(values, ctx, refCtx) {
  const eAG = values.hba1c ? Math.round(28.7 * values.hba1c - 46.7) : null;
  const homaIR = (values.insulin && values.fastingGlucose)
    ? ((values.insulin * values.fastingGlucose) / 405).toFixed(1) : null;
  return `${ctx}
Patient Values: ${JSON.stringify(values)}
${refCtx}

Pre-computed:
- Estimated Average Glucose (eAG) from HbA1c ${values.hba1c}%: ${eAG ? eAG + ' mg/dL' : 'not calculable'}
- HOMA-IR (insulin resistance): ${homaIR || 'not calculable'} ${homaIR ? (parseFloat(homaIR) >= 3 ? '(≥3 = significant insulin resistance)' : parseFloat(homaIR) >= 1 ? '(1–3 = early resistance)' : '(<1 = insulin sensitive)') : ''}

ADA 2024 CLASSIFICATION — cite exact values:
- Fasting Glucose ${values.fastingGlucose}: <100 normal | 100–125 IFG/prediabetes | ≥126 diabetes (requires confirmation)
- HbA1c ${values.hba1c}%: <5.7 normal | 5.7–6.4 prediabetes | ≥6.5 diabetes | ≥8.0 poor control | ≥10 very poor
- 2hr PP ${values.ppGlucose}: <140 normal | 140–199 IGT | ≥200 diabetes
- C-Peptide ${values.cPeptide}: Low = T1DM, High/normal = T2DM

GLYCEMIC CONTROL (cite HbA1c): Good <7%, Fair 7–8%, Poor 8–10%, Very Poor >10%
eAG ${eAG}: "HbA1c ${values.hba1c}% corresponds to an estimated average glucose of ${eAG} mg/dL"
HOMA-IR interpretation: "HOMA-IR ${homaIR} indicates ${homaIR >= 3 ? 'significant' : homaIR >= 1 ? 'early' : 'no'} insulin resistance"

EVERY interpretation must cite: "Value is X, which [meets/does not meet] the Y threshold of Z per ADA 2024"
Return JSON with status, glycemicControl, riskScore, findings, conditions, confidence, urgentFlags (string[]), recommendations (string[]).`;
}

function buildThyroidPrompt(values, ctx, refCtx) {
  return `${ctx}
Patient Values: ${JSON.stringify(values)}
${refCtx}

ATA EXPERT THYROID ANALYSIS — cite ALL values:
TSH ${values.tsh}: 0.4–4.0 normal | <0.1 overt suppression | 0.1–0.4 subclinical low | 4.0–10 subclinical high | >10 overt hypothyroid
Free T4 ${values.freeT4}: 0.8–1.8 ng/dL normal | <0.8 hypothyroid | >1.8 hyperthyroid
Free T3 ${values.freeT3}: 2.3–4.1 pg/mL normal

TSH-BASED CLASSIFICATION:
- Euthyroid: TSH 0.4–4.0 + normal FT3/FT4
- Subclinical Hypothyroid: TSH >4.0 + NORMAL FT4
- Overt Hypothyroid: TSH >10 + LOW FT4 (fatigue, bradycardia, cold intolerance)
- Subclinical Hyperthyroid: TSH 0.1–0.4 + normal FT3/FT4 (AF and bone loss risk)
- Overt Hyperthyroid: TSH <0.1 + HIGH FT3/FT4 (Graves, toxic adenoma)
- T3 Toxicosis: TSH <0.1 + high T3 but normal T4 (early Graves)
- THYROID STORM RISK: TSH <0.01 + FT4 >3.0 + symptoms → EMERGENCY

AUTOIMMUNE:
- Anti-TPO ${values.antiTPO}: ${values.antiTPO > 35 ? `${values.antiTPO} IU/mL ELEVATED (>35 threshold) — autoimmune thyroid disease confirmed` : 'normal'}
- Anti-Tg ${values.antiTg}: ${values.antiTg > 20 ? `${values.antiTg} IU/mL ELEVATED (>20 threshold)` : 'normal'}
- Pattern: Anti-TPO elevated + high TSH = Hashimoto's thyroiditis; Anti-TPO elevated + low TSH = Graves' disease

EVERY interpretation: "TSH is X mIU/L, which [exceeds/is below] the Y threshold of Z mIU/L, indicating..."
Return JSON with status, severity, findings, conditions, confidence, urgentFlags (string[]), recommendations (string[]).`;
}

const ANALYZERS = {
  cbc:      { name: 'Complete Blood Count (CBC)',    buildPrompt: buildCBCPrompt },
  lipid:    { name: 'Lipid Profile',                  buildPrompt: buildLipidPrompt },
  lft:      { name: 'Liver Function Tests (LFT)',     buildPrompt: buildLFTPrompt },
  kft:      { name: 'Kidney Function Tests (KFT)',    buildPrompt: buildKFTPrompt },
  diabetes: { name: 'Diabetes Risk Assessment',       buildPrompt: buildDiabetesPrompt },
  thyroid:  { name: 'Thyroid Function',               buildPrompt: buildThyroidPrompt }
};

// ── POST /api/ai-analyzer/:type ───────────────────────────────────────────────
router.post('/:type', async (req, res) => {
  const type = req.params.type.toLowerCase();
  const analyzer = ANALYZERS[type];
  if (!analyzer) return res.status(400).json({ success: false, message: `Unknown analyzer. Valid: ${Object.keys(ANALYZERS).join(', ')}` });

  const { values, patientAge, patientGender, clinicalNotes, isPregnant } = req.body;
  if (!values || typeof values !== 'object') return res.status(400).json({ success: false, message: 'Provide values object' });

  const gender  = (patientGender || '').toLowerCase();
  const age     = patientAge ? parseInt(patientAge) : null;
  const pregnant = isPregnant === true || isPregnant === 'true';

  const ageGroup = age && age < 18 ? 'Pediatric' : age && age >= 65 ? 'Elderly' : 'Adult';
  const genderLabel = gender === 'female' ? 'Female' : gender === 'male' ? 'Male' : 'Gender unspecified';
  const ctx = `Patient: ${ageGroup} ${genderLabel}${age ? ', Age ' + age : ''}${pregnant ? ', PREGNANT' : ''}${clinicalNotes ? '. Clinical context: ' + clinicalNotes : ''}.`;

  // Build gender/age-aware reference context for the prompt
  const refLines = Object.keys(values).map(k => {
    const ref = getRef(k, gender, age, pregnant);
    return ref ? `${k}: normal ${ref.range}, unit ${ref.unit}` : null;
  }).filter(Boolean);
  const refCtx = `Gender/Age-Specific Reference Ranges for this patient:\n${refLines.join('\n')}`;

  try {
    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: analyzer.buildPrompt(values, ctx, refCtx) + '\n\nReturn ONLY valid JSON. No markdown. No preamble.' }
      ],
      temperature: 0,
      max_tokens: 3000
    });

    let analysis;
    try {
      const raw = completion.choices[0].message.content.trim();
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonStr = cleaned.startsWith('{') ? cleaned : cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1);
      const parsed = JSON.parse(jsonStr);
      parsed.findings = correctFindingSeverities(parsed.findings, values, gender, age, pregnant);
      analysis = normalizeArrays(parsed);
    } catch {
      analysis = { rawAnalysis: completion.choices[0].message.content, urgentFlags: [], recommendations: [], findings: [], conditions: [] };
    }

    const criticalValues = identifyCriticalValues(type, values, gender, age, pregnant);

    res.json({
      success: true,
      data: {
        analyzerType: type, analyzerName: analyzer.name,
        patientContext: { age, gender: genderLabel, ageGroup, isPregnant: pregnant },
        inputValues: values, analysis, criticalValues,
        analyzedAt: new Date().toISOString(),
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'
      }
    });
  } catch (err) {
    logger.error(`AI Analyzer [${type}] error:`, err.message);
    if (err.message?.includes('API key')) return res.status(503).json({ success: false, message: 'GROQ_API_KEY not configured' });
    res.status(500).json({ success: false, message: 'Analysis failed', error: err.message });
  }
});

router.get('/', (req, res) => {
  res.json({ success: true, data: Object.entries(ANALYZERS).map(([k, a]) => ({ type: k, name: a.name, endpoint: `/api/ai-analyzer/${k}` })) });
});

module.exports = router;
