const { query } = require('../config/db');

const createBooking = async (req, res) => {
    try {
        let { computer_id, start_time, end_time, user_id, tariff_id } = req.body;
        
        if (!user_id) {
            user_id = req.user.id;
        }
        
        const startDate = new Date(start_time);
        const endDate = new Date(end_time);
        
        if (startDate < new Date()) {
            return res.status(400).json({ error: 'Нельзя забронировать время в прошлом' });
        }
        
        if (startDate >= endDate) {
            return res.status(400).json({ error: 'Время окончания должно быть позже времени начала' });
        }
        
        const maxDuration = 24 * 60 * 60 * 1000;
        if (endDate - startDate > maxDuration) {
            return res.status(400).json({ error: 'Максимальное время бронирования - 24 часа' });
        }
        
        const computer = await query(
            'SELECT * FROM computers WHERE id = $1',
            [computer_id]
        );
        
        if (computer.rows.length === 0) {
            return res.status(404).json({ error: 'Компьютер не найден' });
        }
        
        const computerData = computer.rows[0];
        
        if (computerData.status === 'broken') {
            return res.status(400).json({ error: 'Компьютер неисправен, бронирование невозможно' });
        }
        
        // Проверка пересечений с другими бронированиями
        const conflictingBookings = await query(
            `SELECT * FROM bookings 
             WHERE computer_id = $1 
             AND status = 'active'
             AND (start_time, end_time) OVERLAPS ($2::timestamp, $3::timestamp)`,
            [computer_id, start_time, end_time]
        );
        
        if (conflictingBookings.rows.length > 0) {
            return res.status(400).json({ 
                error: `Компьютер уже забронирован на это время` 
            });
        }
        
        // Проверка пересечений с активными сеансами
        const activeSessions = await query(
            `SELECT * FROM sessions 
             WHERE computer_id = $1 
             AND end_time IS NULL
             AND (start_time, end_time) OVERLAPS ($2::timestamp, $3::timestamp)`,
            [computer_id, start_time, end_time]
        );
        
        if (activeSessions.rows.length > 0) {
            return res.status(400).json({ 
                error: `Компьютер уже занят в это время` 
            });
        }
        
        const user = await query(
            'SELECT id, full_name FROM users WHERE id = $1',
            [user_id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Создаем бронирование с tariff_id (если передан)
        let result;
        if (tariff_id) {
            result = await query(
                `INSERT INTO bookings (user_id, computer_id, start_time, end_time, status, tariff_id) 
                 VALUES ($1, $2, $3::timestamp, $4::timestamp, 'active', $5) 
                 RETURNING *`,
                [user_id, computer_id, start_time, end_time, tariff_id]
            );
        } else {
            result = await query(
                `INSERT INTO bookings (user_id, computer_id, start_time, end_time, status) 
                 VALUES ($1, $2, $3::timestamp, $4::timestamp, 'active') 
                 RETURNING *`,
                [user_id, computer_id, start_time, end_time]
            );
        }
        
        await query(
            'UPDATE computers SET status = $1 WHERE id = $2',
            ['booked', computer_id]
        );
        
        await query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, $2, $3, $4)`,
            [user_id, 'withdrawal', 0, `Бронирование компьютера ${computerData.name} с ${new Date(start_time).toLocaleString()} до ${new Date(end_time).toLocaleString()}`]
        );
        
        res.status(201).json({ 
            booking: result.rows[0],
            message: `✅ Компьютер ${computerData.name} успешно забронирован!`
        });
        
    } catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ error: 'Ошибка создания бронирования: ' + error.message });
    }
};

const getUserBookings = async (req, res) => {
    try {
        const result = await query(
            `SELECT b.*, c.name as computer_name, h.name as hall_name
             FROM bookings b
             JOIN computers c ON b.computer_id = c.id
             JOIN halls h ON c.hall_id = h.id
             WHERE b.user_id = $1
             ORDER BY b.start_time DESC`,
            [req.user.id]
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({ error: 'Ошибка получения бронирований' });
    }
};

const getAllActiveBookings = async (req, res) => {
    try {
        const result = await query(
            `SELECT b.*, c.name as computer_name, u.full_name as user_name
             FROM bookings b
             JOIN computers c ON b.computer_id = c.id
             JOIN users u ON b.user_id = u.id
             WHERE b.status = 'active'
             ORDER BY b.start_time ASC`,
            []
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get all active bookings error:', error);
        res.status(500).json({ error: 'Ошибка получения активных бронирований' });
    }
};

const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        
        const booking = await query(
            `SELECT b.*, c.name as computer_name 
             FROM bookings b
             JOIN computers c ON b.computer_id = c.id
             WHERE b.id = $1 AND b.status = $2`,
            [id, 'active']
        );
        
        if (booking.rows.length === 0) {
            return res.status(404).json({ error: 'Активное бронирование не найдено' });
        }
        
        const bookingData = booking.rows[0];
        
        if (bookingData.user_id !== req.user.id && req.user.role === 'client') {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        
        if (new Date(bookingData.start_time) <= new Date()) {
            return res.status(400).json({ error: 'Нельзя отменить бронирование, которое уже началось' });
        }
        
        const result = await query(
            'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
            ['cancelled', id]
        );
        
        await query(
            'UPDATE computers SET status = $1 WHERE id = $2',
            ['free', bookingData.computer_id]
        );
        
        await query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, $2, $3, $4)`,
            [bookingData.user_id, 'refund', 0, `Отмена бронирования компьютера ${bookingData.computer_name}`]
        );
        
        res.json({ 
            success: true, 
            booking: result.rows[0],
            message: `✅ Бронирование компьютера ${bookingData.computer_name} успешно отменено`
        });
        
    } catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ error: 'Ошибка отмены бронирования' });
    }
};

module.exports = { createBooking, getUserBookings, getAllActiveBookings, cancelBooking };