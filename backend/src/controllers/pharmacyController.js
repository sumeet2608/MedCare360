const Medicine = require('../models/Medicine');
const { asyncHandler } = require('../middleware/errorHandler');
const drugApi = require('../services/drugApiService');
const { notify } = require('../services/notificationService');

exports.getAllMedicines = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const query = { isActive: true };
  if (req.query.search) {
    query['$or'] = [
      { name: { $regex: req.query.search, $options: 'i' } },
      { genericName: { $regex: req.query.search, $options: 'i' } },
      { brand: { $regex: req.query.search, $options: 'i' } }
    ];
  }
  if (req.query.category) query.category = req.query.category;
  if (req.query.lowStock === 'true') {
    query['$expr'] = { $lte: ['$quantity', '$minStockLevel'] };
  }

  const [medicines, total] = await Promise.all([
    Medicine.find(query).skip(skip).limit(limit).sort({ name: 1 }),
    Medicine.countDocuments(query)
  ]);

  const now = new Date();
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const enriched = medicines.map(m => ({
    ...m.toObject(),
    isLowStock: m.quantity <= m.minStockLevel,
    isExpired: m.expiryDate < now,
    isExpiringSoon: m.expiryDate <= thirtyDays && m.expiryDate >= now
  }));

  res.json({ success: true, count: medicines.length, total, pages: Math.ceil(total / limit), currentPage: page, data: enriched });
});

exports.getMedicineById = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
  res.json({ success: true, data: medicine });
});

exports.createMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.create({ ...req.body, addedBy: req.user._id });
  res.status(201).json({ success: true, data: medicine });
});

exports.updateMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
  res.json({ success: true, data: medicine });
});

exports.updateStock = asyncHandler(async (req, res) => {
  const { quantity, operation } = req.body;
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

  if (operation === 'add') {
    medicine.quantity += quantity;
  } else if (operation === 'remove') {
    if (medicine.quantity < quantity) {
      return res.status(400).json({ success: false, message: 'Insufficient stock' });
    }
    medicine.quantity -= quantity;
  } else {
    medicine.quantity = quantity;
  }

  await medicine.save();

  if (medicine.quantity <= medicine.minStockLevel) {
    try {
      await notify(req.app, {
        recipientRole: 'super_admin',
        type: 'medicine',
        title: 'Low stock alert',
        message: `${medicine.name} is at ${medicine.quantity} units (min ${medicine.minStockLevel}) — reorder needed`,
        priority: 'high',
        relatedId: medicine._id
      });
    } catch (e) { /* non-blocking */ }
  }

  res.json({ success: true, data: medicine, message: 'Stock updated successfully' });
});

exports.getLowStockMedicines = asyncHandler(async (req, res) => {
  const medicines = await Medicine.find({
    isActive: true,
    $expr: { $lte: ['$quantity', '$minStockLevel'] }
  });
  res.json({ success: true, count: medicines.length, data: medicines });
});

exports.getExpiringMedicines = asyncHandler(async (req, res) => {
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const medicines = await Medicine.find({
    isActive: true,
    expiryDate: { $lte: thirtyDays, $gte: new Date() }
  });
  res.json({ success: true, count: medicines.length, data: medicines });
});

exports.deleteMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findByIdAndUpdate(req.params.id, { isActive: false });
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });
  res.json({ success: true, message: 'Medicine deactivated' });
});

// ─── External drug intelligence (RxNorm + OpenFDA, both free/no API key) ──

exports.searchExternalDrugs = asyncHandler(async (req, res) => {
  const q = req.query.q;
  if (!q || q.length < 2) return res.json({ success: true, data: [] });
  try {
    const results = await drugApi.searchRxNorm(q);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(502).json({ success: false, message: 'External drug lookup failed', error: err.message });
  }
});

exports.enrichMedicine = asyncHandler(async (req, res) => {
  const medicine = await Medicine.findById(req.params.id);
  if (!medicine) return res.status(404).json({ success: false, message: 'Medicine not found' });

  const redis = req.app.get('redis');
  const cacheKey = `medicine:enrich:${medicine.genericName.toLowerCase()}`;
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ success: true, source: 'cache', data: JSON.parse(cached) });
    } catch (_) { /* cache miss is non-fatal */ }
  }

  let label = null;
  try { label = await drugApi.getOpenFdaLabel(medicine.genericName); } catch (_) { /* fall through to unavailable */ }

  const enrichment = {
    medicineId: medicine._id,
    name: medicine.name,
    genericName: medicine.genericName,
    openFda: label,
    fetchedAt: new Date().toISOString()
  };

  if (redis && label) {
    try { await redis.set(cacheKey, JSON.stringify(enrichment), 'EX', 86400); } catch (_) { /* non-fatal */ }
  }

  res.json({ success: true, source: label ? 'openfda' : 'unavailable', data: enrichment });
});

exports.compareMedicines = asyncHandler(async (req, res) => {
  const ids = (req.query.ids || '').split(',').filter(Boolean);
  if (!ids.length) return res.status(400).json({ success: false, message: 'Provide an ids query param (comma-separated)' });
  const medicines = await Medicine.find({ _id: { $in: ids } });
  res.json({ success: true, count: medicines.length, data: medicines });
});
