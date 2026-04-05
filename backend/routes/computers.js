const express = require('express');
const { getAllComputers, getComputerById, updateComputerStatus } = require('../controllers/computerController');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

router.get('/', getAllComputers);
router.get('/:id', getComputerById);
router.put('/:id/status', roleCheck('admin', 'owner'), updateComputerStatus);

module.exports = router;