const bcrypt = require('bcrypt');
const { query } = require('../config/db');

async function createTestUsers() {
    try {
        // Хешируем пароли
        const clientPassword = await bcrypt.hash('123456', 10);
        const adminPassword = await bcrypt.hash('admin123', 10);
        const ownerPassword = await bcrypt.hash('owner123', 10);
        
        // Удаляем старых пользователей
        await query('DELETE FROM users WHERE email IN ($1, $2, $3)', 
            ['client@topgamer.com', 'admin@topgamer.com', 'owner@topgamer.com']);
        
        // Создаем новых
        await query(
            `INSERT INTO users (email, password_hash, full_name, phone, role, balance) VALUES
            ($1, $2, $3, $4, $5, $6),
            ($7, $8, $9, $10, $11, $12),
            ($13, $14, $15, $16, $17, $18)`,
            [
                'client@topgamer.com', clientPassword, 'Тестовый Клиент', '+79990000003', 'client', 1000,
                'admin@topgamer.com', adminPassword, 'Администратор', '+79990000002', 'admin', 0,
                'owner@topgamer.com', ownerPassword, 'Владелец Клуба', '+79990000001', 'owner', 0
            ]
        );
        
        console.log('✅ Тестовые пользователи созданы:');
        console.log('Клиент: client@topgamer.com / 123456');
        console.log('Админ: admin@topgamer.com / admin123');
        console.log('Владелец: owner@topgamer.com / owner123');
        
        process.exit(0);
    } catch (error) {
        console.error('Ошибка:', error);
        process.exit(1);
    }
}

createTestUsers();