const Billing = require('../models/Billing');

/**
 * Auto-generate a billing record for a patient event.
 * @param {Object} opts
 * @param {ObjectId} opts.patientId  - Patient._id
 * @param {ObjectId} [opts.appointmentId] - Appointment._id (optional)
 * @param {ObjectId} [opts.generatedBy]   - User._id who triggered this
 * @param {Array}    opts.items  - array of { description, category, quantity, unitPrice }
 * @param {Date}     [opts.dueDate]
 */
async function createAutoBilling({ patientId, appointmentId, generatedBy, items, dueDate }) {
  const billingItems = items.map(item => {
    const total = (item.unitPrice * (item.quantity || 1));
    return { ...item, quantity: item.quantity || 1, total, discount: 0, tax: 0 };
  });

  const subtotal = billingItems.reduce((sum, i) => sum + i.total, 0);

  const billing = new Billing({
    patient: patientId,
    appointment: appointmentId || undefined,
    generatedBy: generatedBy || undefined,
    items: billingItems,
    subtotal,
    totalDiscount: 0,
    totalTax: 0,
    totalAmount: subtotal,
    paidAmount: 0,
    dueAmount: subtotal,
    status: 'pending',
    dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  await billing.save();
  return billing;
}

module.exports = { createAutoBilling };
