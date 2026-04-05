const express = require('express');
const cors = require('cors');
require('dotenv').config();

const routes = require('./routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api', routes);

// Автоматическая очистка просроченных бронирований
const { cleanupExpiredBookings } = require('./utils/cleanupExpiredBookings');
cleanupExpiredBookings();

app.listen(PORT, () => {
    console.log(`✅ Сервер запущен на порту ${PORT}`);
});