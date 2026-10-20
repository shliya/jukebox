require('dotenv').config();
// 啟動時先檢查，避免第一個人登入才發現沒設定
require('./server/lib/ticket-session').getSecret();
const sequelize = require('./server/config/database');
const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3002;
const server = http.createServer(app);

const apiRoute = require('./server/routes/jukebox/index');

app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'public')));

// 只有明確設定 ALLOWED_ORIGINS 時才允許「帶 cookie」的跨來源請求
const allowedOrigins = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
const hasOriginAllowList = allowedOrigins.length > 0;
app.use(
    cors({
        origin: hasOriginAllowList ? allowedOrigins : true,
        credentials: hasOriginAllowList,
    })
);

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    }
    next();
});
app.use('/api/v1', apiRoute);
app.use('/api', (req, res) => {
    res.status(404).json({ status: 'error', message: 'Not Found' });
});
app.get('/robots.txt', (req, res) => {
    res.type('text/plain');
    res.sendFile(path.join(__dirname, 'static', 'robots.txt'));
});

sequelize
    .authenticate()
    .then(() => {
        console.log('資料庫連線成功！');
        server.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    })
    .catch(error => {
        console.error('資料庫連線失敗：', error);
        process.exit(1);
    });

// 優雅關閉處理
function shutdown(signal) {
    console.log(`\n接收到 ${signal}，正在優雅關閉...`);
    server.close(() => {
        sequelize.close().then(() => {
            console.log('資料庫連線已關閉');
            process.exit(0);
        });
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
