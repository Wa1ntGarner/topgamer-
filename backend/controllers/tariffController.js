const { query } = require('../config/db');

const getAllTariffs = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM tariffs ORDER BY computer_type, day_type, time_type'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get tariffs error:', error);
        res.status(500).json({ error: 'Ошибка получения тарифов' });
    }
};

const getTariffById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT * FROM tariffs WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Тариф не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get tariff error:', error);
        res.status(500).json({ error: 'Ошибка получения тарифа' });
    }
};

const updateTariff = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, computer_type, day_type, time_type, price_per_hour, package_hours, package_price } = req.body;
        
        const tariff = await query(
            'SELECT * FROM tariffs WHERE id = $1',
            [id]
        );
        
        if (tariff.rows.length === 0) {
            return res.status(404).json({ error: 'Тариф не найден' });
        }
        
        // Проверяем уникальность комбинации (исключая текущий тариф)
        if (computer_type && day_type && time_type) {
            const existingTariff = await query(
                `SELECT id FROM tariffs 
                 WHERE computer_type = $1 AND day_type = $2 AND time_type = $3 AND id != $4`,
                [computer_type, day_type, time_type, id]
            );
            
            if (existingTariff.rows.length > 0) {
                return res.status(400).json({ 
                    error: 'Тариф с таким типом ПК, днем и временем уже существует' 
                });
            }
        }
        
        const result = await query(
            `UPDATE tariffs 
             SET name = COALESCE($1, name),
                 computer_type = COALESCE($2, computer_type),
                 day_type = COALESCE($3, day_type),
                 time_type = COALESCE($4, time_type),
                 price_per_hour = COALESCE($5, price_per_hour),
                 package_hours = $6,
                 package_price = $7,
                 updated_at = NOW()
             WHERE id = $8
             RETURNING *`,
            [
                name || null,
                computer_type || null,
                day_type || null,
                time_type || null,
                price_per_hour !== undefined ? price_per_hour : null,
                package_hours !== undefined ? package_hours : null,
                package_price !== undefined ? package_price : null,
                id
            ]
        );
        
        res.json({
            success: true,
            tariff: result.rows[0],
            message: `Тариф "${result.rows[0].name}" успешно обновлен`
        });
        
    } catch (error) {
        console.error('Update tariff error:', error);
        res.status(500).json({ error: 'Ошибка обновления тарифа: ' + error.message });
    }
};

const createTariff = async (req, res) => {
    try {
        const { name, computer_type, day_type, time_type, price_per_hour, package_hours, package_price } = req.body;
        
        if (!name || !computer_type || !day_type || !time_type || !price_per_hour) {
            return res.status(400).json({ error: 'Все поля обязательны' });
        }
        
        if (price_per_hour <= 0) {
            return res.status(400).json({ error: 'Цена должна быть положительной' });
        }
        
        // Проверяем, существует ли уже тариф с такой комбинацией
        const existingTariff = await query(
            `SELECT id FROM tariffs 
             WHERE computer_type = $1 AND day_type = $2 AND time_type = $3`,
            [computer_type, day_type, time_type]
        );
        
        if (existingTariff.rows.length > 0) {
            return res.status(400).json({ 
                error: 'Тариф с таким типом ПК, днем и временем уже существует' 
            });
        }
        
        const result = await query(
            `INSERT INTO tariffs (name, computer_type, day_type, time_type, price_per_hour, package_hours, package_price, created_at, updated_at) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
            [name, computer_type, day_type, time_type, price_per_hour, package_hours || null, package_price || null]
        );
        
        res.status(201).json({
            success: true,
            tariff: result.rows[0],
            message: `Тариф "${name}" успешно создан`
        });
        
    } catch (error) {
        console.error('Create tariff error:', error);
        // Если ошибка дубликата, возвращаем понятное сообщение
        if (error.code === '23505') {
            return res.status(400).json({ 
                error: 'Тариф с таким типом ПК, днем и временем уже существует' 
            });
        }
        res.status(500).json({ error: 'Ошибка создания тарифа: ' + error.message });
    }
};

const deleteTariff = async (req, res) => {
    try {
        const { id } = req.params;
        
        const tariff = await query(
            'SELECT * FROM tariffs WHERE id = $1',
            [id]
        );
        
        if (tariff.rows.length === 0) {
            return res.status(404).json({ error: 'Тариф не найден' });
        }
        
        const tariffName = tariff.rows[0].name;
        
        // Обновляем связанные записи
        await query(
            'UPDATE bookings SET tariff_id = NULL WHERE tariff_id = $1',
            [id]
        );
        
        await query(
            'UPDATE sessions SET tariff_id = NULL WHERE tariff_id = $1',
            [id]
        );
        
        await query(
            'DELETE FROM tariffs WHERE id = $1',
            [id]
        );
        
        res.json({
            success: true,
            message: `Тариф "${tariffName}" успешно удален`
        });
        
    } catch (error) {
        console.error('Delete tariff error:', error);
        res.status(500).json({ error: 'Ошибка удаления тарифа: ' + error.message });
    }
};

module.exports = { getAllTariffs, getTariffById, updateTariff, createTariff, deleteTariff };