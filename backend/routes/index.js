const express = require('express');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const authRoutes = require('./auth');
const computerRoutes = require('./computers');
const sessionRoutes = require('./sessions');
const bookingRoutes = require('./bookings');
const productRoutes = require('./products');
const tariffRoutes = require('./tariffs');
const reportRoutes = require('./reports');
const userRoutes = require('./users');

const router = express.Router();

// Публичные маршруты
router.use('/auth', authRoutes);

// Защищенные маршруты
router.use('/computers', authMiddleware, computerRoutes);
router.use('/sessions', authMiddleware, sessionRoutes);
router.use('/bookings', authMiddleware, bookingRoutes);
router.use('/products', authMiddleware, productRoutes);
router.use('/tariffs', authMiddleware, tariffRoutes);
router.use('/reports', authMiddleware, reportRoutes);
router.use('/users', authMiddleware, userRoutes);

module.exports = router;