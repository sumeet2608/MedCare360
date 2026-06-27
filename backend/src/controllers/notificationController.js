const Notification = require('../models/Notification');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getMyNotifications = asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 30;
  const query = { $or: [{ recipient: req.user._id }, { recipientRole: req.user.role }] };

  const [notifications, unreadCount] = await Promise.all([
    Notification.find(query).sort({ createdAt: -1 }).limit(limit),
    Notification.countDocuments({ ...query, isRead: false })
  ]);

  res.json({ success: true, data: notifications, unreadCount });
});

exports.getUnreadCount = asyncHandler(async (req, res) => {
  const count = await Notification.countDocuments({
    $or: [{ recipient: req.user._id }, { recipientRole: req.user.role }],
    isRead: false
  });
  res.json({ success: true, count });
});

exports.markAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, $or: [{ recipient: req.user._id }, { recipientRole: req.user.role }] },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ success: false, message: 'Notification not found' });
  res.json({ success: true, data: notification });
});

exports.markAllAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { $or: [{ recipient: req.user._id }, { recipientRole: req.user.role }], isRead: false },
    { isRead: true }
  );
  res.json({ success: true, message: 'All notifications marked as read' });
});
