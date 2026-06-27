const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  medicineId: { type: String, unique: true },
  name: { type: String, required: true, trim: true },
  genericName: { type: String, required: true },
  brand: String,
  category: {
    type: String,
    enum: ['antibiotic', 'analgesic', 'antiviral', 'antifungal', 'antihistamine', 'antihypertensive', 'antidiabetic', 'cardiac', 'respiratory', 'gastrointestinal', 'neurological', 'psychiatric', 'vitamin_supplement', 'other'],
    required: true
  },
  type: { type: String, enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch', 'suppository', 'powder'], required: true },
  manufacturer: String,
  batchNumber: String,
  expiryDate: { type: Date, required: true },
  manufacturingDate: Date,
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'units' },
  minStockLevel: { type: Number, default: 10 },
  purchasePrice: { type: Number, required: true },
  sellingPrice: { type: Number, required: true },
  description: String,
  dosageInstructions: String,
  sideEffects: [String],
  contraindications: [String],
  activeIngredients: [String],
  storageInstructions: String,
  requiresPrescription: { type: Boolean, default: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  location: String,
  isActive: { type: Boolean, default: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

medicineSchema.pre('save', async function (next) {
  if (!this.medicineId) {
    const count = await mongoose.model('Medicine').countDocuments();
    this.medicineId = `MED${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

medicineSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minStockLevel;
});

medicineSchema.virtual('isExpired').get(function () {
  return this.expiryDate < new Date();
});

medicineSchema.virtual('isExpiringSoon').get(function () {
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return this.expiryDate <= thirtyDays && this.expiryDate >= new Date();
});

module.exports = mongoose.model('Medicine', medicineSchema);
