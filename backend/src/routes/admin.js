'use strict';
/**
 * Admin Reset & Cleanup Routes
 * All require super_admin or hospital_admin role
 */
const router = require('express').Router();
const Patient = require('../models/Patient');
const Billing = require('../models/Billing');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

router.use(protect);
router.use(authorize('super_admin', 'hospital_admin'));

// ── PATCH /api/admin/patients/:id/archive ─────────────────────────────────────
// Full discharge + archive patient — removes from active lists
router.patch('/patients/:id/archive', asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    {
      isArchived: true,
      archivedAt: new Date(),
      archiveReason: req.body.reason || 'Fully discharged and archived by admin',
      isAdmitted: false,
      dischargeDate: new Date(),
      ward: null,
      bedNumber: null
    },
    { new: true }
  ).populate('user', 'firstName lastName');

  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });

  res.json({
    success: true,
    data: patient,
    message: `${patient.user?.firstName} ${patient.user?.lastName} has been discharged and archived`
  });
}));

// ── PATCH /api/admin/patients/:id/unarchive ───────────────────────────────────
// Restore an archived patient back to active lists
router.patch('/patients/:id/unarchive', asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndUpdate(
    req.params.id,
    { isArchived: false, archivedAt: null, archiveReason: null },
    { new: true }
  ).populate('user', 'firstName lastName');
  if (!patient) return res.status(404).json({ success: false, message: 'Patient not found' });
  res.json({ success: true, data: patient, message: 'Patient restored to active' });
}));

// ── POST /api/admin/billing/archive-cleared ───────────────────────────────────
// Archive all cleared (fully paid) invoices — resets the "Cleared" list to zero
router.post('/billing/archive-cleared', asyncHandler(async (req, res) => {
  const result = await Billing.updateMany(
    { $or: [{ clearedAt: { $exists: true, $ne: null } }, { status: 'paid', dueAmount: 0 }], isArchived: { $ne: true } },
    { isArchived: true, archivedAt: new Date() }
  );
  res.json({
    success: true,
    message: `${result.modifiedCount} cleared invoice(s) archived`,
    count: result.modifiedCount
  });
}));

// ── POST /api/admin/billing/reset-revenue ─────────────────────────────────────
// Archive ALL invoices (paid + pending) — resets revenue stats to ₹0
router.post('/billing/reset-revenue', asyncHandler(async (req, res) => {
  const result = await Billing.updateMany(
    { isArchived: { $ne: true } },
    { isArchived: true, archivedAt: new Date() }
  );
  res.json({
    success: true,
    message: `Revenue reset: ${result.modifiedCount} invoice(s) archived. Monthly stats now show ₹0.`,
    count: result.modifiedCount
  });
}));

// ── POST /api/admin/billing/restore-archived ──────────────────────────────────
// Restore all archived invoices (undo reset)
router.post('/billing/restore-archived', asyncHandler(async (req, res) => {
  const result = await Billing.updateMany(
    { isArchived: true },
    { isArchived: false, archivedAt: null }
  );
  res.json({ success: true, message: `${result.modifiedCount} invoice(s) restored`, count: result.modifiedCount });
}));

module.exports = router;
