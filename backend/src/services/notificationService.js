// Creates a Notification record and pushes it over the existing Socket.io connection
// (rooms `user:<id>` and `admin-room` are already joined by clients in server.js).
const Notification = require('../models/Notification');

async function notify(app, { recipient, recipientRole, type, title, message, priority = 'normal', relatedId }) {
  const doc = await Notification.create({ recipient, recipientRole, type, title, message, priority, relatedId });

  const io = app.get('io');
  if (io) {
    const payload = doc.toObject();
    if (recipient) io.to(`user:${recipient}`).emit('notification', payload);
    if (recipientRole) io.to('admin-room').emit('notification', payload);
  }

  return doc;
}

module.exports = { notify };
