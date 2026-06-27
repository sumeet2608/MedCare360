'use strict';
const router = require('express').Router();
const ctrl = require('../controllers/telemedicineController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/',                           ctrl.getSessions);
router.post('/',                          ctrl.createSession);
router.get('/upcoming',                   ctrl.getUpcomingSessions);
router.get('/:sessionId/join',            ctrl.joinSession);
router.post('/:sessionId/end',            ctrl.endSession);
router.post('/:sessionId/rating',         ctrl.addRating);

module.exports = router;
