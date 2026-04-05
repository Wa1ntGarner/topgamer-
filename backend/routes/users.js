const express = require('express');
const { getAllUsers, getUserById, updateUser, updatePassword, updateBalance } = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

const router = express.Router();

// Админ и владелец могут видеть всех пользователей
router.get('/', authMiddleware, roleCheck('admin', 'owner'), getAllUsers);

// Получить пользователя по ID
router.get('/:id', authMiddleware, getUserById);

// Обновление пользователя (клиент может обновлять свой профиль)
router.put('/:id', authMiddleware, async (req, res, next) => {
    if (req.user.role === 'client' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
}, updateUser);

// Смена пароля
router.put('/:id/password', authMiddleware, async (req, res, next) => {
    if (req.user.id !== req.params.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
}, updatePassword);

// Пополнение баланса
router.post('/:id/balance', authMiddleware, async (req, res, next) => {
    if (req.user.role === 'client' && req.params.id !== req.user.id) {
        return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
}, updateBalance);

module.exports = router;