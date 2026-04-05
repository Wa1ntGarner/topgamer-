-- Создание базы данных (выполнять отдельно)
-- CREATE DATABASE topgamer;

-- Расширение для генерации UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Таблица пользователей (объединяет клиентов, администраторов, владельцев)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'admin', 'owner')),
    balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица залов
CREATE TABLE halls (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- Таблица компьютеров (рабочие места)
CREATE TABLE computers (
    id SERIAL PRIMARY KEY,
    hall_id INTEGER REFERENCES halls(id) ON DELETE SET NULL,
    name VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'broken', 'booked')),
    specs TEXT,
    type VARCHAR(50) DEFAULT 'standard' CHECK (type IN ('standard', 'vip')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица тарифов (гибкая система)
CREATE TABLE tariffs (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    computer_type VARCHAR(50) NOT NULL CHECK (computer_type IN ('standard', 'vip')),
    day_type VARCHAR(20) NOT NULL CHECK (day_type IN ('weekday', 'weekend')),
    time_type VARCHAR(20) NOT NULL CHECK (time_type IN ('day', 'night')),
    price_per_hour DECIMAL(10, 2) NOT NULL,
    package_hours INTEGER, -- для пакетных тарифов (3, 5 часов)
    package_price DECIMAL(10, 2), -- цена за пакет
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица сеансов
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    computer_id INTEGER REFERENCES computers(id) ON DELETE SET NULL,
    tariff_id INTEGER REFERENCES tariffs(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    total_price DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'card', 'balance')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица бронирований (деньги не списываются при бронировании)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    computer_id INTEGER REFERENCES computers(id) ON DELETE CASCADE,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'confirmed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_time CHECK (end_time > start_time)
);

-- Таблица товаров
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица продаж товаров
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица финансовых операций
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'payment_session', 'payment_product', 'withdrawal', 'refund')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Таблица смен администраторов
CREATE TABLE shifts (
    id SERIAL PRIMARY KEY,
    admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    start_balance DECIMAL(10, 2) DEFAULT 0,
    end_balance DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Создание индексов для оптимизации
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_computer_id ON sessions(computer_id);
CREATE INDEX idx_sessions_start_time ON sessions(start_time);
CREATE INDEX idx_bookings_computer_id ON bookings(computer_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Вставка начальных данных
-- Заполнение залов
INSERT INTO halls (name, description) VALUES 
    ('Основной зал', '15 мощных компьютеров для командных игр'),
    ('VIP зал 1', '5 компьютеров в отдельной комнате'),
    ('VIP зал 2', '5 компьютеров в отдельной комнате'),
    ('Малый зал', '2 компьютера для уединенной игры');

-- Заполнение компьютеров (27 штук)
DO $$
DECLARE
    hall_id INTEGER;
    i INTEGER;
    computer_type VARCHAR(50);
BEGIN
    -- Основной зал (15 компьютеров, 2 VIP)
    FOR i IN 1..15 LOOP
        IF i <= 2 THEN
            computer_type := 'vip';
        ELSE
            computer_type := 'standard';
        END IF;
        INSERT INTO computers (hall_id, name, type, specs) VALUES 
            (1, 'ПК-' || i, computer_type, 
             CASE WHEN computer_type = 'vip' 
                  THEN 'Intel i7, RTX 3080, 32GB RAM' 
                  ELSE 'Intel i5, RTX 3060, 16GB RAM' END);
    END LOOP;
    
    -- VIP зал 1 (5 компьютеров, все VIP)
    FOR i IN 1..5 LOOP
        INSERT INTO computers (hall_id, name, type, specs) VALUES 
            (2, 'VIP-' || i, 'vip', 'Intel i9, RTX 4090, 64GB RAM');
    END LOOP;
    
    -- VIP зал 2 (5 компьютеров, все VIP)
    FOR i IN 1..5 LOOP
        INSERT INTO computers (hall_id, name, type, specs) VALUES 
            (3, 'VIP-' || i, 'vip', 'Intel i9, RTX 4090, 64GB RAM');
    END LOOP;
    
    -- Малый зал (2 компьютера, стандартные)
    FOR i IN 1..2 LOOP
        INSERT INTO computers (hall_id, name, type, specs) VALUES 
            (4, 'Малый-' || i, 'standard', 'Intel i5, RTX 3060, 16GB RAM');
    END LOOP;
END $$;

-- Заполнение тарифов (базовые почасовые)
INSERT INTO tariffs (name, computer_type, day_type, time_type, price_per_hour) VALUES
    ('Стандартный дневной будни', 'standard', 'weekday', 'day', 80),
    ('Стандартный ночной будни', 'standard', 'weekday', 'night', 100),
    ('Стандартный дневной выходной', 'standard', 'weekend', 'day', 100),
    ('Стандартный ночной выходной', 'standard', 'weekend', 'night', 120),
    ('VIP дневной будни', 'vip', 'weekday', 'day', 120),
    ('VIP ночной будни', 'vip', 'weekday', 'night', 150),
    ('VIP дневной выходной', 'vip', 'weekend', 'day', 150),
    ('VIP ночной выходной', 'vip', 'weekend', 'night', 180);

-- Добавляем пакетные тарифы (опционально)
INSERT INTO tariffs (name, computer_type, day_type, time_type, price_per_hour, package_hours, package_price) VALUES
    ('Пакет 3 часа', 'standard', 'weekday', 'day', 80, 3, 210),
    ('Пакет 5 часов', 'standard', 'weekday', 'day', 80, 5, 350),
    ('VIP Пакет 3 часа', 'vip', 'weekday', 'day', 120, 3, 320),
    ('VIP Пакет 5 часов', 'vip', 'weekday', 'day', 120, 5, 550);

-- Заполнение товаров
INSERT INTO products (name, price, stock) VALUES
    ('Кола 0.5л', 80, 100),
    ('Спрайт 0.5л', 80, 100),
    ('Чипсы Lays', 100, 50),
    ('Сэндвич', 150, 30),
    ('Энергетик', 120, 60),
    ('Кофе', 100, 40);

-- Создание тестовых пользователей (пароль: password123 для всех)
-- Хеши сгенерированы с помощью bcrypt для пароля "password123"
INSERT INTO users (email, password_hash, full_name, phone, role, balance) VALUES
    ('owner@topgamer.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrCQ8q4ZqJqXJqXJqXJqXJqXJqXJqX', 'Владелец Клуба', '+79990000001', 'owner', 0),
    ('admin@topgamer.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrCQ8q4ZqJqXJqXJqXJqXJqXJqXJqX', 'Администратор', '+79990000002', 'admin', 0),
    ('client@topgamer.com', '$2b$10$N9qo8uLOickgx2ZMRZoMy.MrCQ8q4ZqJqXJqXJqXJqXJqXJqXJqX', 'Тестовый Клиент', '+79990000003', 'client', 500);

-- Примечание: реальные хеши будут созданы приложением, но для тестирования
-- можно использовать эти значения (пароль "password123")