const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');

const getAllUsers = async (req, res) => {
    try {
        const { search } = req.query;
        let queryText = 'SELECT id, email, full_name, phone, role, balance, created_at FROM users ORDER BY created_at DESC';
        let params = [];
        
        if (search && search.trim()) {
            queryText = `SELECT id, email, full_name, phone, role, balance, created_at 
                         FROM users 
                         WHERE role = 'client' 
                         AND (phone LIKE $1 OR full_name ILIKE $2)
                         ORDER BY created_at DESC`;
            params = [`%${search}%`, `%${search}%`];
        } else {
            queryText = 'SELECT id, email, full_name, phone, role, balance, created_at FROM users WHERE role = $1 ORDER BY created_at DESC';
            params = ['client'];
        }
        
        const result = await query(queryText, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Ошибка получения пользователей' });
    }
};

const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT id, email, full_name, phone, role, balance, created_at FROM users WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Ошибка получения пользователя' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { email, full_name, phone } = req.body;
        
        // Проверяем, что пользователь обновляет свой профиль или админ
        if (req.user.role === 'client' && req.user.id !== id) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (email !== undefined) {
            // Проверяем, не занят ли email другим пользователем
            if (email && email.trim() !== '') {
                const existingUser = await query(
                    'SELECT id FROM users WHERE email = $1 AND id != $2',
                    [email, id]
                );
                if (existingUser.rows.length > 0) {
                    return res.status(400).json({ error: 'Этот email уже используется' });
                }
                updates.push(`email = $${paramIndex++}`);
                values.push(email);
            } else {
                // Если email пустой, устанавливаем NULL
                updates.push(`email = $${paramIndex++}`);
                values.push(null);
            }
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${paramIndex++}`);
            values.push(full_name);
        }
        if (phone !== undefined) {
            updates.push(`phone = $${paramIndex++}`);
            values.push(phone);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        updates.push(`updated_at = NOW()`);
        values.push(id);
        const queryText = `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING id, email, full_name, phone, role, balance, created_at`;
        
        const result = await query(queryText, values);
        
        res.json({
            success: true,
            user: result.rows[0],
            message: 'Данные обновлены'
        });
        
    } catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ error: 'Ошибка обновления данных: ' + error.message });
    }
};

const updatePassword = async (req, res) => {
    try {
        const { id } = req.params;
        const { current_password, new_password } = req.body;
        
        // Проверяем, что пользователь меняет свой пароль
        if (req.user.id !== id) {
            return res.status(403).json({ error: 'Недостаточно прав' });
        }
        
        // Получаем текущего пользователя
        const user = await query(
            'SELECT password_hash FROM users WHERE id = $1',
            [id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        // Проверяем текущий пароль
        const isValid = await comparePassword(current_password, user.rows[0].password_hash);
        
        if (!isValid) {
            return res.status(400).json({ error: 'Неверный текущий пароль' });
        }
        
        // Проверяем новый пароль
        if (!new_password || new_password.length < 6) {
            return res.status(400).json({ error: 'Новый пароль должен содержать минимум 6 символов' });
        }
        
        // Хешируем новый пароль
        const hashedPassword = await hashPassword(new_password);
        
        // Обновляем пароль
        await query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, id]
        );
        
        res.json({
            success: true,
            message: 'Пароль успешно изменен'
        });
        
    } catch (error) {
        console.error('Update password error:', error);
        res.status(500).json({ error: 'Ошибка смены пароля: ' + error.message });
    }
};

const updateBalance = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;
        
        console.log('Пополнение баланса:', { userId: id, amount, requestedBy: req.user.id, role: req.user.role });
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'Сумма должна быть положительной' });
        }
        
        const user = await query(
            'SELECT balance FROM users WHERE id = $1',
            [id]
        );
        
        if (user.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        const currentBalance = parseFloat(user.rows[0].balance);
        const newBalance = currentBalance + parseFloat(amount);
        
        const result = await query(
            'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING id, balance',
            [newBalance, id]
        );
        
        await query(
            `INSERT INTO transactions (user_id, type, amount, description) 
             VALUES ($1, $2, $3, $4)`,
            [id, 'deposit', amount, `Пополнение баланса на ${amount} ₽`]
        );
        
        console.log('Баланс обновлен:', { userId: id, oldBalance: currentBalance, newBalance });
        
        res.json({ 
            success: true, 
            id: result.rows[0].id, 
            balance: result.rows[0].balance,
            message: `Баланс пополнен на ${amount} ₽`
        });
    } catch (error) {
        console.error('Update balance error:', error);
        res.status(500).json({ error: 'Ошибка обновления баланса: ' + error.message });
    }
};

module.exports = { getAllUsers, getUserById, updateUser, updatePassword, updateBalance };