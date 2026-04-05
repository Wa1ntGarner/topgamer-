const { query } = require('../config/db');

const getRevenueReport = async (req, res) => {
    try {
        const { start_date, end_date } = req.query;
        
        let dateFilter = '';
        const params = [];
        
        if (start_date && end_date) {
            dateFilter = 'WHERE created_at BETWEEN $1 AND $2';
            params.push(start_date, end_date);
        }
        
        const result = await query(
            `SELECT 
                DATE(created_at) as date,
                SUM(CASE WHEN type = 'payment_session' THEN amount ELSE 0 END) as sessions_revenue,
                SUM(CASE WHEN type = 'payment_product' THEN amount ELSE 0 END) as products_revenue,
                SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as deposits,
                SUM(amount) as total_revenue
             FROM transactions
             ${dateFilter}
             GROUP BY DATE(created_at)
             ORDER BY date DESC`,
            params
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get revenue report error:', error);
        res.status(500).json({ error: 'Ошибка получения отчета о выручке' });
    }
};

const getOccupancyReport = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                DATE(start_time) as date,
                COUNT(*) as total_sessions,
                ROUND(AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600), 1) as avg_duration_hours,
                SUM(total_price) as total_revenue
             FROM sessions
             WHERE end_time IS NOT NULL
             GROUP BY DATE(start_time)
             ORDER BY date DESC
             LIMIT 30`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get occupancy report error:', error);
        res.status(500).json({ error: 'Ошибка получения отчета о загрузке' });
    }
};

const getPopularTariffs = async (req, res) => {
    try {
        const result = await query(
            `SELECT 
                t.name as tariff_name,
                COUNT(s.id) as sessions_count,
                SUM(s.total_price) as total_revenue
             FROM sessions s
             JOIN tariffs t ON s.tariff_id = t.id
             WHERE s.end_time IS NOT NULL
             GROUP BY t.id, t.name
             ORDER BY sessions_count DESC`
        );
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get popular tariffs error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики тарифов' });
    }
};

module.exports = { getRevenueReport, getOccupancyReport, getPopularTariffs };