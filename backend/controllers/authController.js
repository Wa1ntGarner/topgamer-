const { query } = require('../config/db');
const { hashPassword, comparePassword } = require('../utils/hash');
const jwt = require('jsonwebtoken');

const register = async (req, res) => {
    try {
        const { email, password, full_name, phone } = req.body;
        
        // Проверка существующего пользователя по телефону
        const existingUser = await query(
            'SELECT id FROM users WHERE phone = $1',
            [phone]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Телефон уже зарегистрирован' });
        }
        
        // Если email указан, проверяем его уникальность
        if (email && email.trim() !== '') {
            const existingEmail = await query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );
            if (existingEmail.rows.length > 0) {
                return res.status(400).json({ error: 'Этот email уже зарегистрирован' });
            }
        }
        
        const hashedPassword = await hashPassword(password);
        
        // Email может быть пустым - сохраняем как NULL
        const userEmail = email && email.trim() !== '' ? email : null;
        
        const result = await query(
            `INSERT INTO users (email, password_hash, full_name, phone, role) 
             VALUES ($1, $2, $3, $4, 'client') RETURNING id, email, full_name, phone, role, balance`,
            [userEmail, hashedPassword, full_name, phone]
        );
        
        const user = result.rows[0];
        const token = jwt.sign(
            { id: user.id, email: user.email, phone: user.phone, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        res.status(201).json({ user, token });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Ошибка регистрации: ' + error.message });
    }
};

const login = async (req, res) => {
    try {
        const { login, password } = req.body;
        
        // Поиск по телефону или email
        let user;
        if (login.includes('@')) {
            // Поиск по email
            const result = await query(
                'SELECT * FROM users WHERE email = $1',
                [login]
            );
            user = result.rows[0];
        } else {
            // Поиск по телефону
            const result = await query(
                'SELECT * FROM users WHERE phone = $1',
                [login]
            );
            user = result.rows[0];
        }
        
        if (!user) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const isValid = await comparePassword(password, user.password_hash);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Неверный логин или пароль' });
        }
        
        const token = jwt.sign(
            { id: user.id, email: user.email, phone: user.phone, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        const { password_hash, ...userWithoutPassword } = user;
        
        res.json({ user: userWithoutPassword, token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Ошибка входа' });
    }
};

const getMe = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, full_name, phone, role, balance, created_at FROM users WHERE id = $1',
            [req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get me error:', error);
        res.status(500).json({ error: 'Ошибка получения данных' });
    }
};

module.exports = { register, login, getMe };