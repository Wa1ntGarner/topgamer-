const express = require('express');
const { 
    getAllTariffs, 
    getTariffById, 
    updateTariff, 
    createTariff, 
    deleteTariff 
} = require('../controllers/tariffController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Для всех авторизованных - просмотр тарифов
router.get('/', authMiddleware, getAllTariffs);
router.get('/:id', authMiddleware, getTariffById);

// Только для владельца - управление тарифами
router.post('/', authMiddleware, roleCheck('owner'), createTariff);
router.put('/:id', authMiddleware, roleCheck('owner'), updateTariff);
router.delete('/:id', authMiddleware, roleCheck('owner'), deleteTariff);

module.exports = router;