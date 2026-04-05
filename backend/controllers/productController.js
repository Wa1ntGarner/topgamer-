const { query } = require('../config/db');

const getAllProducts = async (req, res) => {
    try {
        const result = await query(
            'SELECT * FROM products ORDER BY name'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Ошибка получения товаров' });
    }
};

const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ error: 'Ошибка получения товара' });
    }
};

const createProduct = async (req, res) => {
    try {
        const { name, price, stock } = req.body;
        
        console.log('Создание товара:', { name, price, stock });
        
        if (!name || !price) {
            return res.status(400).json({ error: 'Название и цена обязательны' });
        }
        
        if (price <= 0) {
            return res.status(400).json({ error: 'Цена должна быть положительной' });
        }
        
        const result = await query(
            `INSERT INTO products (name, price, stock, created_at, updated_at) 
             VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *`,
            [name, price, stock || 0]
        );
        
        console.log('Товар создан:', result.rows[0]);
        
        res.status(201).json({
            success: true,
            product: result.rows[0],
            message: `Товар "${name}" успешно добавлен`
        });
        
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: 'Ошибка создания товара: ' + error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, stock } = req.body;
        
        console.log('Обновление товара:', { id, name, price, stock });
        
        const product = await query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        
        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        if (name !== undefined) {
            updates.push(`name = $${paramIndex++}`);
            values.push(name);
        }
        if (price !== undefined) {
            updates.push(`price = $${paramIndex++}`);
            values.push(price);
        }
        if (stock !== undefined) {
            updates.push(`stock = $${paramIndex++}`);
            values.push(stock);
        }
        
        updates.push(`updated_at = NOW()`);
        
        if (updates.length === 1) {
            return res.status(400).json({ error: 'Нет данных для обновления' });
        }
        
        values.push(id);
        const queryText = `UPDATE products SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        const result = await query(queryText, values);
        
        console.log('Товар обновлен:', result.rows[0]);
        
        res.json({
            success: true,
            product: result.rows[0],
            message: `Товар "${result.rows[0].name}" успешно обновлен`
        });
        
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Ошибка обновления товара: ' + error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        
        const product = await query(
            'SELECT * FROM products WHERE id = $1',
            [id]
        );
        
        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const productName = product.rows[0].name;
        
        await query(
            'DELETE FROM sales WHERE product_id = $1',
            [id]
        );
        
        await query(
            'DELETE FROM products WHERE id = $1',
            [id]
        );
        
        console.log('Товар удален:', productName);
        
        res.json({
            success: true,
            message: `Товар "${productName}" успешно удален`
        });
        
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Ошибка удаления товара: ' + error.message });
    }
};

const sellProduct = async (req, res) => {
    try {
        const { session_id, product_id, quantity } = req.body;
        
        console.log('Продажа товара:', { session_id, product_id, quantity, user: req.user });
        
        const product = await query(
            'SELECT * FROM products WHERE id = $1',
            [product_id]
        );
        
        if (product.rows.length === 0) {
            return res.status(404).json({ error: 'Товар не найден' });
        }
        
        const productData = product.rows[0];
        
        if (productData.stock < quantity) {
            return res.status(400).json({ error: 'Недостаточно товара на складе' });
        }
        
        const totalPrice = productData.price * quantity;
        
        const session = await query(
            `SELECT s.*, u.balance as user_balance, u.id as user_id, u.full_name as user_name
             FROM sessions s
             JOIN users u ON s.user_id = u.id
             WHERE s.id = $1 AND s.end_time IS NULL`,
            [session_id]
        );
        
        if (session.rows.length === 0) {
            return res.status(404).json({ error: 'Активный сеанс не найден' });
        }
        
        const sessionData = session.rows[0];
        const currentBalance = parseFloat(sessionData.user_balance);
        
        // Проверка: если клиент пытается купить товар не для своего сеанса
        if (req.user.role === 'client' && req.user.id !== sessionData.user_id) {
            return res.status(403).json({ error: 'Недостаточно прав. Вы можете покупать товары только для своего сеанса.' });
        }
        
        console.log('Баланс клиента:', currentBalance, 'Сумма покупки:', totalPrice);
        
        if (currentBalance < totalPrice) {
            return res.status(400).json({ 
                error: `Недостаточно средств на балансе. Необходимо: ${totalPrice} ₽, ваш баланс: ${currentBalance} ₽`
            });
        }
        
        const newBalance = currentBalance - totalPrice;
        await query(
            'UPDATE users SET balance = $1, updated_at = NOW() WHERE id = $2',
            [newBalance, sessionData.user_id]
        );
        
        await query(
            'UPDATE products SET stock = stock - $1, updated_at = NOW() WHERE id = $2',
            [quantity, product_id]
        );
        
        const saleResult = await query(
            `INSERT INTO sales (session_id, product_id, quantity, total_price, created_at) 
             VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
            [session_id, product_id, quantity, totalPrice]
        );
        
        await query(
            `INSERT INTO transactions (user_id, session_id, type, amount, description, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [
                sessionData.user_id,
                session_id,
                'payment_product',
                totalPrice,
                `${productData.name} x${quantity} - ${totalPrice} ₽`
            ]
        );
        
        console.log('Продажа успешно выполнена:', {
            product: productData.name,
            quantity,
            totalPrice,
            newBalance,
            client: sessionData.user_name
        });
        
        res.status(201).json({
            success: true,
            sale: saleResult.rows[0],
            newBalance: newBalance,
            message: `Продано ${quantity} x ${productData.name}. С баланса списано ${totalPrice} ₽. Новый баланс: ${newBalance} ₽`
        });
        
    } catch (error) {
        console.error('Sell product error:', error);
        res.status(500).json({ error: 'Ошибка продажи товара: ' + error.message });
    }
};

module.exports = { 
    getAllProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct, 
    sellProduct 
};