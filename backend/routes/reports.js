const express = require('express');
const { getRevenueReport, getOccupancyReport, getPopularTariffs } = require('../controllers/reportController');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.get('/revenue', roleCheck('owner'), getRevenueReport);
router.get('/occupancy', roleCheck('owner'), getOccupancyReport);
router.get('/tariffs', roleCheck('owner'), getPopularTariffs);

module.exports = router;