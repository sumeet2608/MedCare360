const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { chat, scanMedicine, getEmergencyGuidance } = require('../controllers/aiController');
const { runCommand, getSuggestions } = require('../controllers/aiCommandController');

// Public routes (no auth required)
router.get('/emergency/:emergency', getEmergencyGuidance);

// Protected routes (require JWT)
router.use(protect);
router.post('/chat', chat);
router.post('/scan-medicine', scanMedicine);
router.post('/command', runCommand);
router.get('/command/suggestions', getSuggestions);

module.exports = router;
