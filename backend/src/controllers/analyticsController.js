const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Billing = require('../models/Billing');
const Medicine = require('../models/Medicine');
const LabTest = require('../models/LabTest');
const Bed = require('../models/Bed');
const Inventory = require('../models/Inventory');
const Ambulance = require('../models/Ambulance');
const { asyncHandler } = require('../middleware/errorHandler');
const { withCache } = require('../utils/cache');

const CACHE_TTL = 30; // seconds — analytics don't need to be second-fresh, but shouldn't go stale for long either

exports.getDashboardStats = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:dashboard', CACHE_TTL, async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalPatients, totalDoctors, admittedPatients,
      todayAppointments, monthlyAppointments,
      todayRevenue, monthlyRevenue, pendingBills,
      lowStockMedicines
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments({ status: 'active' }),
      Patient.countDocuments({ isAdmitted: true }),
      Appointment.countDocuments({ appointmentDate: { $gte: today }, status: { $nin: ['cancelled'] } }),
      Appointment.countDocuments({ appointmentDate: { $gte: monthStart }, status: { $nin: ['cancelled'] } }),
      Billing.aggregate([{ $match: { status: 'paid', paymentDate: { $gte: today } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Billing.aggregate([{ $match: { status: 'paid', paymentDate: { $gte: monthStart } } }, { $group: { _id: null, total: { $sum: '$paidAmount' } } }]),
      Billing.countDocuments({ status: { $in: ['pending', 'overdue'] } }),
      Medicine.countDocuments({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } })
    ]);

    return {
      success: true,
      data: {
        totalPatients,
        totalDoctors,
        admittedPatients,
        todayAppointments,
        monthlyAppointments,
        todayRevenue: todayRevenue[0]?.total || 0,
        monthlyRevenue: monthlyRevenue[0]?.total || 0,
        pendingBills,
        lowStockMedicines
      }
    };
  });
});

exports.getRevenueChart = asyncHandler(async (req, res) => {
  const { period = 'monthly' } = req.query;
  await withCache(req, res, `analytics:revenue:${period}`, CACHE_TTL, async () => {
    const now = new Date();
    let startDate, groupBy;

    if (period === 'daily') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      groupBy = { $dayOfMonth: '$paymentDate' };
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      groupBy = { $month: '$paymentDate' };
    } else {
      startDate = new Date(now.getFullYear() - 2, 0, 1);
      groupBy = { $year: '$paymentDate' };
    }

    const revenue = await Billing.aggregate([
      { $match: { status: 'paid', paymentDate: { $gte: startDate } } },
      { $group: { _id: groupBy, total: { $sum: '$paidAmount' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

    return { success: true, data: revenue };
  });
});

exports.getAppointmentStats = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:appointments', CACHE_TTL, async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [statusBreakdown, dailyTrend] = await Promise.all([
      Appointment.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Appointment.aggregate([
        { $match: { appointmentDate: { $gte: thirtyDaysAgo } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    return { success: true, data: { statusBreakdown, dailyTrend } };
  });
});

exports.getPatientDemographics = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:demographics', CACHE_TTL, async () => {
    const [genderDist, bloodGroupDist, ageGroups] = await Promise.all([
      Patient.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Patient.aggregate([{ $match: { bloodGroup: { $exists: true, $ne: null } } }, { $group: { _id: '$bloodGroup', count: { $sum: 1 } } }]),
      Patient.aggregate([
        {
          $addFields: {
            age: { $dateDiff: { startDate: '$dateOfBirth', endDate: '$$NOW', unit: 'year' } }
          }
        },
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [0, 18, 30, 45, 60, 75, 100],
            default: 'Unknown',
            output: { count: { $sum: 1 } }
          }
        }
      ])
    ]);

    return { success: true, data: { genderDist, bloodGroupDist, ageGroups } };
  });
});

exports.getBedOccupancy = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:beds', CACHE_TTL, async () => {
    const [statusBreakdown, wardBreakdown] = await Promise.all([
      Bed.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Bed.aggregate([
        { $group: { _id: '$ward', total: { $sum: 1 }, occupied: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } } } },
        { $sort: { _id: 1 } }
      ])
    ]);
    const totalBeds = statusBreakdown.reduce((s, b) => s + b.count, 0);
    const occupied = statusBreakdown.find(b => b._id === 'occupied')?.count || 0;
    return { success: true, data: { statusBreakdown, wardBreakdown, totalBeds, occupied, occupancyRate: totalBeds ? Math.round((occupied / totalBeds) * 1000) / 10 : 0 } };
  });
});

exports.getMedicineStockAnalytics = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:medicines', CACHE_TTL, async () => {
    const [byCategory, lowStockTop] = await Promise.all([
      Medicine.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', totalQuantity: { $sum: '$quantity' }, medicineCount: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } } } },
        { $sort: { totalValue: -1 } }
      ]),
      Medicine.find({ isActive: true, $expr: { $lte: ['$quantity', '$minStockLevel'] } })
        .select('name quantity minStockLevel category')
        .sort({ quantity: 1 })
        .limit(10)
    ]);
    return { success: true, data: { byCategory, lowStockTop } };
  });
});

exports.getInventoryTrends = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:inventory', CACHE_TTL, async () => {
    const [byCategory, byCondition] = await Promise.all([
      Inventory.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 }, totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$purchasePrice', 0] }] } } } },
        { $sort: { totalValue: -1 } }
      ]),
      Inventory.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$condition', count: { $sum: 1 } } }])
    ]);
    return { success: true, data: { byCategory, byCondition } };
  });
});

exports.getAmbulanceAnalytics = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:ambulances', CACHE_TTL, async () => {
    const [byStatus, byType] = await Promise.all([
      Ambulance.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Ambulance.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
    ]);
    return { success: true, data: { byStatus, byType } };
  });
});

exports.getDepartmentPerformance = asyncHandler(async (req, res) => {
  await withCache(req, res, 'analytics:departments', CACHE_TTL, async () => {
    const performance = await Appointment.aggregate([
      { $lookup: { from: 'doctors', localField: 'doctor', foreignField: '_id', as: 'doctorInfo' } },
      { $unwind: '$doctorInfo' },
      {
        $group: {
          _id: '$doctorInfo.specialization',
          totalAppointments: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          revenue: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$consultationFee', 0] } }
        }
      },
      { $sort: { totalAppointments: -1 } }
    ]);
    return { success: true, data: performance };
  });
});
