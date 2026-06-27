const mongoose = require('mongoose');

const billingItemSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, enum: ['consultation', 'procedure', 'medicine', 'lab_test', 'room', 'nursing', 'ambulance', 'equipment', 'other'] },
  quantity: { type: Number, default: 1 },
  unitPrice: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, required: true }
});

const billingSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  items: [billingItemSchema],
  subtotal: { type: Number, required: true },
  totalDiscount: { type: Number, default: 0 },
  totalTax: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  paidAmount: { type: Number, default: 0 },
  dueAmount: { type: Number, default: 0 },
  status: { type: String, enum: ['pending', 'partial', 'paid', 'overdue', 'cancelled'], default: 'pending' },
  paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'insurance', 'online', 'cheque'] },
  paymentDate: Date,
  clearedAt: Date,   // set when dueAmount reaches 0 — fully settled
  isArchived: { type: Boolean, default: false },
  archivedAt: Date,  // admin reset — archived invoices excluded from stats
  insurance: {
    provider: String,
    policyNumber: String,
    claimNumber: String,
    claimAmount: Number,
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'] }
  },
  dueDate: Date,
  notes: String,
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

billingSchema.pre('save', async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model('Billing').countDocuments();
    this.invoiceNumber = `INV${new Date().getFullYear()}${String(count + 1).padStart(6, '0')}`;
  }
  this.dueAmount = this.totalAmount - this.paidAmount;
  next();
});

module.exports = mongoose.model('Billing', billingSchema);
