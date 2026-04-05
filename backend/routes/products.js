const express = require('express');
const { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    sellProduct 
} = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Для всех авторизованных - просмотр товаров
router.get('/', authMiddleware, getAllProducts);
router.get('/:id', authMiddleware, getProductById);

// Продажа товаров - доступна клиентам (для своего сеанса), админам и владельцам
router.post('/sell', authMiddleware, sellProduct);

// Только для владельца - управление товарами
router.post('/', authMiddleware, roleCheck('owner'), createProduct);
router.put('/:id', authMiddleware, roleCheck('owner'), updateProduct);
router.delete('/:id', authMiddleware, roleCheck('owner'), deleteProduct);

module.exports = router;