const Ambulance = require('../models/Ambulance');
const { asyncHandler } = require('../middleware/errorHandler');
const { notify } = require('../services/notificationService');

exports.getAllAmbulances = asyncHandler(async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;

  const ambulances = await Ambulance.find(query)
    .populate('driver', 'firstName lastName phone')
    .populate('medicalStaff', 'firstName lastName')
    .sort({ createdAt: -1 });

  res.json({ success: true, count: ambulances.length, data: ambulances });
});

exports.getAmbulanceById = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.id)
    .populate('driver', 'firstName lastName phone')
    .populate('medicalStaff', 'firstName lastName');
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
  res.json({ success: true, data: ambulance });
});

exports.createAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.create(req.body);
  res.status(201).json({ success: true, data: ambulance });
});

exports.updateAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
  res.json({ success: true, data: ambulance });
});

exports.dispatchAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.id);
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
  if (ambulance.status !== 'available') {
    return res.status(400).json({ success: false, message: `Ambulance is currently ${ambulance.status}` });
  }

  ambulance.status = 'dispatched';
  ambulance.currentDispatch = { ...req.body, dispatchTime: new Date() };
  await ambulance.save();

  try {
    await notify(req.app, {
      recipientRole: 'super_admin',
      type: 'ambulance',
      title: 'Ambulance dispatched',
      message: `${ambulance.vehicleNumber} dispatched to ${req.body.pickupAddress || 'a pickup location'}`,
      priority: 'high',
      relatedId: ambulance._id
    });
  } catch (e) { /* non-blocking */ }

  res.json({ success: true, data: ambulance, message: 'Ambulance dispatched successfully' });
});

exports.completeDispatch = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.id);
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

  if (ambulance.currentDispatch) {
    ambulance.dispatchHistory.push({
      ...ambulance.currentDispatch.toObject(),
      completedAt: new Date()
    });
  }

  ambulance.status = 'available';
  ambulance.currentDispatch = undefined;
  await ambulance.save();

  res.json({ success: true, data: ambulance, message: 'Dispatch completed' });
});

exports.updateLocation = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findByIdAndUpdate(
    req.params.id,
    { 'location.latitude': req.body.latitude, 'location.longitude': req.body.longitude, 'location.address': req.body.address, 'location.lastUpdated': new Date() },
    { new: true }
  );
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });

  const io = req.app.get('io');
  if (io) {
    io.to('admin-room').to(`ambulance:${ambulance._id}`).emit('ambulance-location', {
      ambulanceId: ambulance._id,
      vehicleNumber: ambulance.vehicleNumber,
      location: ambulance.location,
      status: ambulance.status
    });
  }

  res.json({ success: true, data: ambulance.location });
});

exports.getAvailableAmbulances = asyncHandler(async (req, res) => {
  const ambulances = await Ambulance.find({ status: 'available' })
    .populate('driver', 'firstName lastName phone');
  res.json({ success: true, count: ambulances.length, data: ambulances });
});

exports.deleteAmbulance = asyncHandler(async (req, res) => {
  const ambulance = await Ambulance.findById(req.params.id);
  if (!ambulance) return res.status(404).json({ success: false, message: 'Ambulance not found' });
  if (ambulance.status === 'dispatched') {
    return res.status(400).json({ success: false, message: 'Cannot delete a dispatched ambulance' });
  }
  await ambulance.deleteOne();
  res.json({ success: true, message: 'Ambulance deleted' });
});
