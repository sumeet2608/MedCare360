const Groq = require('groq-sdk');
const Appointment = require('../models/Appointment');
const Medicine = require('../models/Medicine');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const LabTest = require('../models/LabTest');
const Billing = require('../models/Billing');
const Bed = require('../models/Bed');
const { asyncHandler } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Tool definitions (Groq/OpenAI-compatible function-calling schema) ────

const tools = [
  {
    type: 'function',
    function: {
      name: 'get_todays_appointments',
      description: "Get the list of appointments scheduled for today, including patient name, doctor name, time and status.",
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_low_stock_medicines',
      description: 'Get medicines that are at or below their minimum stock level and need reordering.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_available_doctors',
      description: 'Find active doctors by medical specialization, e.g. Cardiology, Pediatrics, Orthopedics.',
      parameters: {
        type: 'object',
        properties: { specialization: { type: 'string', description: 'The medical specialization to search for' } },
        required: ['specialization']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_patient_summary',
      description: 'Generate a clinical summary for a specific patient by their name or patient ID — includes vitals, allergies, chronic conditions, and recent appointments.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Patient full name or patient ID to search for' } },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_lab_reports',
      description: 'Get recently completed lab test reports across the hospital.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_operational_insights',
      description: 'Get a hospital-wide operational snapshot: patient count, monthly revenue, bed occupancy, pending bills.',
      parameters: { type: 'object', properties: {}, required: [] }
    }
  }
];

// ─── Tool implementations (real DB queries, no fabricated data) ──────────

async function getTodaysAppointments() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 86400000);
  const appts = await Appointment.find({ appointmentDate: { $gte: today, $lt: tomorrow } })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
    .populate({ path: 'doctor', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ appointmentTime: 1 })
    .limit(25);
  return appts.map(a => ({
    patient: `${a.patient?.user?.firstName || ''} ${a.patient?.user?.lastName || ''}`.trim(),
    doctor: `Dr. ${a.doctor?.user?.firstName || ''} ${a.doctor?.user?.lastName || ''}`.trim(),
    time: a.appointmentTime,
    status: a.status
  }));
}

async function getLowStockMedicines() {
  const meds = await Medicine.find({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } })
    .select('name quantity minStockLevel category')
    .sort({ quantity: 1 })
    .limit(20);
  return meds.map(m => ({ name: m.name, quantity: m.quantity, minStockLevel: m.minStockLevel, category: m.category }));
}

async function findAvailableDoctors(args) {
  const doctors = await Doctor.find({ specialization: { $regex: args.specialization, $options: 'i' }, status: 'active' })
    .populate('user', 'firstName lastName')
    .sort({ rating: -1 })
    .limit(10);
  return doctors.map(d => ({
    name: `Dr. ${d.user?.firstName || ''} ${d.user?.lastName || ''}`.trim(),
    specialization: d.specialization,
    rating: d.rating,
    consultationFee: d.consultationFee,
    experience: d.experience
  }));
}

async function generatePatientSummary(args) {
  const query = args.query || '';
  const patients = await Patient.find({ patientId: { $regex: query, $options: 'i' } })
    .populate('user', 'firstName lastName')
    .limit(5);

  let matches = patients;
  if (!matches.length) {
    const byName = await Patient.find()
      .populate({ path: 'user', match: { $or: [{ firstName: { $regex: query, $options: 'i' } }, { lastName: { $regex: query, $options: 'i' } }] }, select: 'firstName lastName' })
      .limit(20);
    matches = byName.filter(p => p.user);
  }

  if (!matches.length) return { found: false, query };

  const p = matches[0];
  const recentAppointments = await Appointment.find({ patient: p._id }).sort({ appointmentDate: -1 }).limit(5).select('appointmentDate status type diagnosis');

  return {
    found: true,
    name: `${p.user?.firstName || ''} ${p.user?.lastName || ''}`.trim(),
    patientId: p.patientId,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    chronicConditions: p.chronicConditions || [],
    allergies: (p.allergies || []).map(a => a.allergen),
    latestVitals: p.vitals?.[p.vitals.length - 1] || null,
    recentAppointments: recentAppointments.map(a => ({ date: a.appointmentDate, status: a.status, type: a.type, diagnosis: a.diagnosis }))
  };
}

async function getRecentLabReports() {
  const reports = await LabTest.find({ status: 'completed' })
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } })
    .sort({ completedAt: -1 })
    .limit(15);
  return reports.map(r => ({
    patient: `${r.patient?.user?.firstName || ''} ${r.patient?.user?.lastName || ''}`.trim(),
    testName: r.testName,
    category: r.category,
    completedAt: r.completedAt
  }));
}

async function getOperationalInsights() {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalPatients, monthlyRevenueAgg, pendingBills, bedStats] = await Promise.all([
    Patient.countDocuments(),
    Billing.aggregate([{ $match: { status: 'paid', paymentDate: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
    Billing.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
    Bed.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);

  const totalBeds = bedStats.reduce((s, b) => s + b.count, 0);
  const occupied = bedStats.find(b => b._id === 'occupied')?.count || 0;

  return {
    totalPatients,
    monthlyRevenue: monthlyRevenueAgg[0]?.total || 0,
    pendingBills,
    bedOccupancyRate: totalBeds ? Math.round((occupied / totalBeds) * 1000) / 10 : 0
  };
}

const TOOL_IMPL = {
  get_todays_appointments: getTodaysAppointments,
  get_low_stock_medicines: getLowStockMedicines,
  find_available_doctors: findAvailableDoctors,
  generate_patient_summary: generatePatientSummary,
  get_recent_lab_reports: getRecentLabReports,
  get_operational_insights: getOperationalInsights
};

const SYSTEM_PROMPT = `You are the MedCare 360 AI Operations Hub. You help hospital staff find information and get summaries by calling the tools available to you.
Always call a tool when the user's request matches one, rather than guessing an answer.
After receiving tool results, respond concisely and clearly, formatted for a busy hospital staff member to scan quickly.
If no tool matches the request, politely say you can only help with appointments, medicines, doctors, patient summaries, lab reports, and operational insights.`;

exports.runCommand = asyncHandler(async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, message: 'message is required' });

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: message }
  ];

  const first = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    tools,
    tool_choice: 'auto',
    temperature: 0.2
  });

  const choice = first.choices[0];
  const toolCalls = choice.message.tool_calls;

  if (!toolCalls || !toolCalls.length) {
    return res.json({ success: true, data: { answer: choice.message.content, toolUsed: null, toolData: null } });
  }

  const call = toolCalls[0];
  const fnName = call.function.name;
  let args = {};
  try { args = JSON.parse(call.function.arguments || '{}'); } catch (_) { /* default to empty args */ }

  const impl = TOOL_IMPL[fnName];
  if (!impl) {
    return res.json({ success: true, data: { answer: `I don't have a tool called "${fnName}" available.`, toolUsed: fnName, toolData: null } });
  }

  let toolResult;
  try {
    toolResult = await impl(args);
  } catch (err) {
    logger.error(`AI command tool execution failed (${fnName}): ${err.message}`);
    return res.json({ success: true, data: { answer: 'Something went wrong while fetching that data. Please try again.', toolUsed: fnName, toolData: null } });
  }

  messages.push(choice.message);
  messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(toolResult) });

  const second = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages,
    temperature: 0.3
  });

  logger.info(`AI Command Center - User: ${req.user._id}, Tool: ${fnName}`);

  res.json({
    success: true,
    data: {
      answer: second.choices[0].message.content,
      toolUsed: fnName,
      toolData: toolResult
    }
  });
});

exports.getSuggestions = (req, res) => {
  res.json({
    success: true,
    data: [
      "Show today's appointments",
      'Show low stock medicines',
      'Find available cardiologists',
      'Generate a summary for patient Amit Shah',
      'Show recent lab reports',
      'Generate operational insights'
    ]
  });
};
