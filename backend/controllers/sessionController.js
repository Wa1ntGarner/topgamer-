const { query } = require('../config/db');
const { calculateSessionPrice } = require('../utils/tariffCalculator');

const startSession = async (req, res) => {
    try {
        const { user_id, computer_id } = req.body;
        
        if (req.user.role === 'client' && req.user.id !== user_id) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        
        const computer = await query(
            'SELECT status, type, name FROM computers WHERE id = $1',
            [computer_id]
        );
        
        if (computer.rows.length === 0) {
            return res.status(404).json({ error: 'Компьютер не найден' });
        }
        
        const computerData = computer.rows[0];
        
        if (computerData.status === 'broken') {
            return res.status(400).json({ error: 'Компьютер неисправен' });
        }
        
        if (computerData.status === 'occupied') {
            return res.status(400).json({ error: 'Компьютер уже занят' });
        }
        
        const user = await query(
            'SELECT balance, full_name FROM users WHERE id = $1',
            [user_id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const userData = user.rows[0];
        
        // Минимальный баланс для начала сеанса - 100 ₽
        if (parseFloat(userData.balance) < 100) {
            return res.status(400).json({ 
                error: `Недостаточно средств на балансе. Минимальный депозит: 100 ₽. Ваш баланс: ${userData.balance} ₽`
            });
        }
        
        // Проверяем, есть ли активное бронирование
        const now = new Date();
        const activeBooking = await query(
            `SELECT * FROM bookings 
             WHERE computer_id = $1 
             AND user_id = $2
             AND status = 'active'
             AND start_time <= $3::timestamp
             AND end_time >= $3::timestamp`,
            [computer_id, user_id, now]
        );
        
        if (activeBooking.rows.length > 0) {
            const booking = activeBooking.rows[0];
            await query(
                'UPDATE bookings SET status = $1 WHERE id = $2',
                ['confirmed', booking.id]
            );
            console.log(`Бронирование ${booking.id} подтверждено при начале сеанса`);
        }
        
        const tariff = await query(
            `SELECT id FROM tariffs 
             WHERE computer_type = $1 
             AND package_hours IS NULL
             ORDER BY id LIMIT 1`,
            [computerData.type]
        );
        
        if (tariff.rows.length === 0) {
            return res.status(404).json({ error: 'Тариф не найден' });
        }
        
        const result = await query(
            `INSERT INTO sessions (user_id, computer_id, tariff_id, start_time) 
             VALUES ($1, $2, $3, NOW()) RETURNING *`,
            [user_id, computer_id, tariff.rows[0].id]
        );
        
        await query(
            'UPDATE computers SET status = $1 WHERE id = $2',
            ['occupied', computer_id]
        );
        
        console.log('Сеанс начат:', { user_id, computer_id, session_id: result.rows[0].id });
        
        res.status(201).json({ 
            session: result.rows[0],
            message: `Сеанс начат! Компьютер ${computerData.name} активирован для ${userData.full_name}`
        });
        
    } catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({ error: 'Ошибка начала сеанса: ' + error.message });
    }
};

const endSession = async (req, res) => {
    try {
        const { session_id, payment_method } = req.body;
        
        const session = await query(
            `SELECT s.*, c.type as computer_type, c.name as computer_name, u.balance as user_balance, u.id as user_id
             FROM sessions s
             JOIN computers c ON s.computer_id = c.id
             JOIN users u ON s.user_id = u.id
             WHERE s.id = $1 AND s.end_time IS NULL`,
            [session_id]
        );
        
        if (session.rows.length === 0) {
            return res.status(404).json({ error: 'Активный сеанс не найден' });
        }
        
        const sessionData = session.rows[0];
        
        const totalPrice = await calculateSessionPrice(
            sessionData.computer_id,
            sessionData.start_time,
            new Date()
        );
        
        if (payment_method === 'balance') {
            if (parseFloat(sessionData.user_balance) < totalPrice) {
                return res.status(400).json({ 
                    error: `Недостаточно средств на балансе. Необходимо: ${totalPrice} ₽, ваш баланс: ${sessionData.user_balance} ₽`
                });
            }
            
            await query(
                'UPDATE users SET balance = balance - $1 WHERE id = $2',
                [totalPrice, sessionData.user_id]
            );
        }
        
        const result = await query(
            `UPDATE sessions 
             SET end_time = NOW(), total_price = $1, payment_method = $2 
             WHERE id = $3 RETURNING *`,
            [totalPrice, payment_method, session_id]
        );
        
        await query(
            'UPDATE computers SET status = $1 WHERE id = $2',
            ['free', sessionData.computer_id]
        );
        
        await query(
            `INSERT INTO transactions (user_id, session_id, type, amount, description) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                sessionData.user_id,
                session_id,
                'payment_session',
                totalPrice,
                `Оплата сеанса на компьютере ${sessionData.computer_name}`
            ]
        );
        
        console.log('Сеанс завершен:', { session_id, totalPrice, payment_method });
        
        res.json({ 
            success: true,
            session: result.rows[0],
            totalPrice: totalPrice,
            message: `Сеанс завершен. Сумма к оплате: ${totalPrice} ₽`
        });
        
    } catch (error) {
        console.error('End session error:', error);
        res.status(500).json({ error: 'Ошибка завершения сеанса: ' + error.message });
    }
};

const getActiveSessions = async (req, res) => {
    try {
        const result = await query(
            `SELECT s.*, u.full_name as user_name, c.name as computer_name, c.type as computer_type
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             JOIN computers c ON s.computer_id = c.id
             WHERE s.end_time IS NULL
             ORDER BY s.start_time DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get active sessions error:', error);
        res.status(500).json({ error: 'Ошибка получения активных сеансов' });
    }
};

module.exports = { startSession, endSession, getActiveSessions };