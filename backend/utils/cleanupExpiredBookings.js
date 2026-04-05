const { query } = require('../config/db');

const cleanupExpiredBookings = async () => {
    try {
        const now = new Date();
        
        const expiredBookings = await query(
            `SELECT * FROM bookings 
             WHERE status = 'active' 
             AND end_time < $1`,
            [now]
        );
        
        for (const booking of expiredBookings.rows) {
            await query(
                'UPDATE bookings SET status = $1 WHERE id = $2',
                ['expired', booking.id]
            );
            
            const activeSession = await query(
                `SELECT * FROM sessions 
                 WHERE computer_id = $1 
                 AND end_time IS NULL`,
                [booking.computer_id]
            );
            
            if (activeSession.rows.length === 0) {
                const computer = await query(
                    'SELECT status FROM computers WHERE id = $1',
                    [booking.computer_id]
                );
                
                if (computer.rows[0].status === 'booked') {
                    await query(
                        'UPDATE computers SET status = $1 WHERE id = $2',
                        ['free', booking.computer_id]
                    );
                }
            }
            
            console.log(`Бронирование ${booking.id} истекло, компьютер ${booking.computer_id} освобожден`);
        }
        
        if (expiredBookings.rows.length > 0) {
            console.log(`Освобождено ${expiredBookings.rows.length} просроченных бронирований`);
        }
    } catch (error) {
        console.error('Ошибка при очистке просроченных бронирований:', error);
    }
};

setInterval(cleanupExpiredBookings, 60 * 1000);

module.exports = { cleanupExpiredBookings };