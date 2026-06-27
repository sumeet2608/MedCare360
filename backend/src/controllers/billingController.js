const Billing = require('../models/Billing');
const Patient = require('../models/Patient');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

exports.getAllBillings = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { isArchived: { $ne: true } }; // archived invoices hidden unless explicitly requested
  if (req.query.status) query.status = req.query.status;
  if (req.query.patient) query.patient = req.query.patient;
  if (req.query.includeArchived === 'true') delete query.isArchived;

  if (req.user.role === 'patient') {
    const patient = await Patient.findOne({ user: req.user._id });
    if (patient) query.patient = patient._id;
  }

  const [billings, total] = await Promise.all([
    Billing.find(query)
      .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email' } })
      .skip(skip).limit(limit).sort({ createdAt: -1 }),
    Billing.countDocuments(query)
  ]);

  res.json({ success: true, count: billings.length, total, pages: Math.ceil(total / limit), currentPage: page, data: billings });
});

exports.getBillingById = asyncHandler(async (req, res) => {
  const billing = await Billing.findById(req.params.id)
    .populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email phone' } })
    .populate('appointment');
  if (!billing) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: billing });
});

exports.createBilling = asyncHandler(async (req, res) => {
  const billing = await Billing.create({ ...req.body, generatedBy: req.user._id });
  await billing.populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName email' } });
  res.status(201).json({ success: true, data: billing });
});

exports.updateBilling = asyncHandler(async (req, res) => {
  const billing = await Billing.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!billing) return res.status(404).json({ success: false, message: 'Invoice not found' });
  res.json({ success: true, data: billing });
});

exports.recordPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod } = req.body;
  const billing = await Billing.findById(req.params.id);
  if (!billing) return res.status(404).json({ success: false, message: 'Invoice not found' });

  billing.paidAmount += amount;
  billing.paymentMethod = paymentMethod;
  billing.paymentDate = new Date();
  billing.dueAmount = billing.totalAmount - billing.paidAmount;

  if (billing.dueAmount <= 0) {
    billing.status = 'paid';
    billing.dueAmount = 0;
    billing.clearedAt = new Date(); // marks invoice as fully cleared/settled
  } else {
    billing.status = 'partial';
  }

  await billing.save();
  await billing.populate({ path: 'patient', populate: { path: 'user', select: 'firstName lastName' } });

  try {
    await notify(req.app, {
      recipient: billing.patient?.user?._id,
      type: 'billing',
      title: billing.status === 'paid' ? 'Invoice paid in full' : 'Payment received',
      message: `Payment of ₹${amount} recorded for invoice ${billing.invoiceNumber}`,
      relatedId: billing._id
    });
  } catch (e) { /* non-blocking */ }

  res.json({ success: true, data: billing, message: 'Payment recorded successfully' });
});

exports.getBillingStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const notArchived = { isArchived: { $ne: true } };
  const [todayRevenue, monthRevenue, pending] = await Promise.all([
    Billing.aggregate([
      { $match: { ...notArchived, status: 'paid', paymentDate: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]),
    Billing.aggregate([
      { $match: { ...notArchived, status: 'paid', paymentDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$paidAmount' } } }
    ]),
    Billing.aggregate([
      { $match: { ...notArchived, status: { $in: ['pending', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$dueAmount' } } }
    ])
  ]);

  res.json({
    success: true,
    data: {
      todayRevenue: todayRevenue[0]?.total || 0,
      monthRevenue: monthRevenue[0]?.total || 0,
      pendingAmount: pending[0]?.total || 0
    }
  });
});
