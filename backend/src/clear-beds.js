'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
const Bed = require('./models/Bed');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const { deletedCount } = await Bed.deleteMany({});
  console.log(`Deleted ${deletedCount} beds`);
  await mongoose.disconnect();
}).catch(e => { console.error(e); process.exit(1); });
