const { query } = require('../config/db');

// Функция для определения тарифа на основе времени и типа ПК
const getApplicableTariff = async (computerType, startTime) => {
    const date = new Date(startTime);
    const dayOfWeek = date.getDay();
    const hour = date.getHours();
    
    // Определяем день: будни (1-5) или выходные (0,6)
    const dayType = (dayOfWeek >= 1 && dayOfWeek <= 5) ? 'weekday' : 'weekend';
    
    // Определяем время: день (8:00-23:59) или ночь (0:00-7:59)
    const timeType = (hour >= 8 && hour <= 23) ? 'day' : 'night';
    
    const result = await query(
        `SELECT * FROM tariffs 
         WHERE computer_type = $1 
         AND day_type = $2 
         AND time_type = $3`,
        [computerType, dayType, timeType]
    );
    
    return result.rows[0];
};

// Расчет стоимости сеанса
const calculateSessionPrice = async (computerId, startTime, endTime) => {
    // Получаем тип компьютера
    const computer = await query(
        'SELECT type FROM computers WHERE id = $1',
        [computerId]
    );
    
    if (computer.rows.length === 0) {
        throw new Error('Компьютер не найден');
    }
    
    const computerType = computer.rows[0].type;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const hours = Math.ceil((end - start) / (1000 * 60 * 60));
    
    let totalPrice = 0;
    let currentTime = new Date(start);
    
    // Почасовая тарификация
    for (let i = 0; i < hours; i++) {
        const tariff = await getApplicableTariff(computerType, currentTime);
        if (tariff) {
            totalPrice += parseFloat(tariff.price_per_hour);
        }
        currentTime.setHours(currentTime.getHours() + 1);
    }
    
    return totalPrice;
};

module.exports = { getApplicableTariff, calculateSessionPrice };