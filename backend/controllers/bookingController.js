const { query } = require('../config/db');

const createBooking = async (req, res) => {
    try {
        let { computer_id, start_time, end_time, user_id, tariff_id } = req.body;
        
        if (!user_id) {
            user_id = req.user.id;
        }
        
        // Парсим даты как локальные (без преобразования в UTC)
        const startDate = new Date(start_time);
        const endDate = new Date(end_time);
        const now = new Date();
        
        // Проверка: нельзя бронировать в прошлом (сравниваем локальные даты)
        if (startDate < now) {
            return res.status(400).json({ error: 'Нельзя забронировать время в прошлом' });
        }
        
        if (startDate >= endDate) {
            return res.status(400).json({ error: 'Время окончания должно быть позже времени начала' });
        }
        
        const maxDuration = 24 * 60 * 60 * 1000;
        if (endDate - startDate > maxDuration) {
            return res.status(400).json({ error: 'Максимальное время бронирования - 24 часа' });
        }
        
        // Проверяем компьютер
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
        
        // Сохраняем время как есть (локальное время клиента)
        const startTimeISO = new Date(startDate.getTime() - (startDate.getTimezoneOffset() * 60000)).toISOString();
        const endTimeISO = new Date(endDate.getTime() - (endDate.getTimezoneOffset() * 60000)).toISOString();
        
        // Проверка пересечений с другими бронированиями
        const conflictingBookings = await query(
            `SELECT * FROM bookings 
             WHERE computer_id = $1 
             AND status = 'active'
             AND (start_time, end_time) OVERLAPS ($2::timestamp, $3::timestamp)`,
            [computer_id, startTimeISO, endTimeISO]
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
            [computer_id, startTimeISO, endTimeISO]
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
        
        // Сохраняем бронирование
        let result;
        if (tariff_id) {
            result = await query(
                `INSERT INTO bookings (user_id, computer_id, start_time, end_time, status, tariff_id) 
                 VALUES ($1, $2, $3::timestamp, $4::timestamp, 'active', $5) 
                 RETURNING *`,
                [user_id, computer_id, startTimeISO, endTimeISO, tariff_id]
            );
        } else {
            result = await query(
                `INSERT INTO bookings (user_id, computer_id, start_time, end_time, status) 
                 VALUES ($1, $2, $3::timestamp, $4::timestamp, 'active') 
                 RETURNING *`,
                [user_id, computer_id, startTimeISO, endTimeISO]
            );
        }
        
        await query(
            'UPDATE computers SET status = $1 WHERE id = $2',
            ['booked', computer_id]
        );
        
        await query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, $2, $3, $4)`,
            [user_id, 'withdrawal', 0, `Бронирование компьютера ${computerData.name} с ${startDate.toLocaleString()} до ${endDate.toLocaleString()}`]
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
        
        // Преобразуем время из UTC в локальное для каждого бронирования
        const bookings = result.rows.map(booking => {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);
            
            // Добавляем смещение часового пояса для отображения
            const offset = startTime.getTimezoneOffset();
            const localStartTime = new Date(startTime.getTime() - offset * 60000);
            const localEndTime = new Date(endTime.getTime() - offset * 60000);
            
            return {
                ...booking,
                start_time_local: localStartTime.toISOString(),
                end_time_local: localEndTime.toISOString(),
                start_time_display: localStartTime.toLocaleString(),
                end_time_display: localEndTime.toLocaleString()
            };
        });
        
        res.json(bookings);
    } catch (error) {
        console.error('Get user bookings error:', error);
        res.status(500).json({ error: 'Ошибка получения бронирований' });
    }
};

const getAllActiveBookings = async (req, res) => {
    try {
        const result = await query(
            `SELECT b.*, c.name as computer_name, u.full_name as user_name, u.phone as user_phone
             FROM bookings b
             JOIN computers c ON b.computer_id = c.id
             JOIN users u ON b.user_id = u.id
             WHERE b.status = 'active'
             ORDER BY b.start_time ASC`,
            []
        );
        
        // Преобразуем время из UTC в локальное
        const bookings = result.rows.map(booking => {
            const startTime = new Date(booking.start_time);
            const endTime = new Date(booking.end_time);
            const offset = startTime.getTimezoneOffset();
            const localStartTime = new Date(startTime.getTime() - offset * 60000);
            const localEndTime = new Date(endTime.getTime() - offset * 60000);
            
            return {
                ...booking,
                start_time_local: localStartTime.toISOString(),
                end_time_local: localEndTime.toISOString()
            };
        });
        
        res.json(bookings);
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
        
        // Проверяем, не началось ли уже бронирование (сравниваем с текущим временем)
        const bookingStartTime = new Date(bookingData.start_time);
        const now = new Date();
        
        if (bookingStartTime <= now) {
            return res.status(400).json({ error: 'Нельзя отменить бронирование, которое уже началось' });
        }
        
        if (bookingData.user_id !== req.user.id && req.user.role === 'client') {
            return res.status(403).json({ error: 'Недостаточно прав' });
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