const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register, login, getMe, updateProfile,
  changePassword, forgotPassword, resetPassword, logout
} = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

module.exports = router;
