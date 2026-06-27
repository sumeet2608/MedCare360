const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemId: { type: String, unique: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['medical_equipment', 'surgical_instruments', 'consumables', 'ppe', 'diagnostic', 'furniture', 'it_equipment', 'other'], required: true },
  description: String,
  model: String,
  manufacturer: String,
  serialNumber: String,
  quantity: { type: Number, required: true, default: 0 },
  unit: String,
  minStockLevel: { type: Number, default: 5 },
  location: String,
  ward: String,
  purchaseDate: Date,
  purchasePrice: Number,
  warrantyExpiry: Date,
  lastMaintenanceDate: Date,
  nextMaintenanceDate: Date,
  condition: { type: String, enum: ['new', 'good', 'fair', 'poor', 'out_of_service'], default: 'good' },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  isActive: { type: Boolean, default: true },
  notes: String,
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

inventorySchema.pre('save', async function (next) {
  if (!this.itemId) {
    const count = await mongoose.model('Inventory').countDocuments();
    this.itemId = `INV${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

inventorySchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minStockLevel;
});

module.exports = mongoose.model('Inventory', inventorySchema);
