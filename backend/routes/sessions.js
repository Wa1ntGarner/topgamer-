const express = require('express');
const { startSession, endSession, getActiveSessions } = require('../controllers/sessionController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.get('/active', authMiddleware, getActiveSessions);
router.post('/start', authMiddleware, roleCheck('admin', 'client'), startSession);
router.post('/end', authMiddleware, roleCheck('admin'), endSession);

module.exports = router;