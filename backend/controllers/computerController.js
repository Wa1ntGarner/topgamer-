const { query } = require('../config/db');

const getAllComputers = async (req, res) => {
    try {
        const result = await query(
            `SELECT c.*, h.name as hall_name, h.description as hall_description
             FROM computers c
             LEFT JOIN halls h ON c.hall_id = h.id
             ORDER BY h.id, c.id`
        );
        
        // Группировка по залам
        const halls = {};
        result.rows.forEach(computer => {
            if (!halls[computer.hall_id]) {
                halls[computer.hall_id] = {
                    id: computer.hall_id,
                    name: computer.hall_name,
                    description: computer.hall_description,
                    computers: []
                };
            }
            halls[computer.hall_id].computers.push({
                id: computer.id,
                name: computer.name,
                status: computer.status,
                type: computer.type,
                specs: computer.specs
            });
        });
        
        res.json(Object.values(halls));
    } catch (error) {
        console.error('Get computers error:', error);
        res.status(500).json({ error: 'Ошибка получения списка компьютеров' });
    }
};

const getComputerById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            `SELECT c.*, h.name as hall_name 
             FROM computers c
             LEFT JOIN halls h ON c.hall_id = h.id
             WHERE c.id = $1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Компьютер не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get computer error:', error);
        res.status(500).json({ error: 'Ошибка получения компьютера' });
    }
};

const updateComputerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        console.log('Обновление статуса ПК:', { computerId: id, newStatus: status, requestedBy: req.user.role });
        
        const validStatuses = ['free', 'occupied', 'broken', 'booked'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Неверный статус. Допустимые: free, occupied, broken, booked' });
        }
        
        // Проверяем, существует ли компьютер
        const computer = await query(
            'SELECT * FROM computers WHERE id = $1',
            [id]
        );
        
        if (computer.rows.length === 0) {
            return res.status(404).json({ error: 'Компьютер не найден' });
        }
        
        const oldStatus = computer.rows[0].status;
        
        // Обновляем статус
        const result = await query(
            'UPDATE computers SET status = $1 WHERE id = $2 RETURNING *',
            [status, id]
        );
        
        console.log('Статус обновлен:', { computerId: id, oldStatus, newStatus: status });
        
        res.json({ 
            success: true, 
            computer: result.rows[0],
            message: `Статус ПК изменен с "${oldStatus}" на "${status}"`
        });
    } catch (error) {
        console.error('Update computer status error:', error);
        res.status(500).json({ error: 'Ошибка обновления статуса: ' + error.message });
    }
};

module.exports = { getAllComputers, getComputerById, updateComputerStatus };