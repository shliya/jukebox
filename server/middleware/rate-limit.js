const { rateLimit } = require('express-rate-limit');

function createLimiter(limit, message) {
    return rateLimit({
        windowMs: 60 * 1000,
        limit,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        message: { status: 'error', message },
    });
}

module.exports = {
    // 票券登入：每 IP 每分鐘 10 次，防止暴力猜碼
    rateLimitLogin: createLimiter(10, '嘗試太多次，請稍後再試'),
    // 點歌：每 IP 每分鐘 20 次
    rateLimitVote: createLimiter(20, '操作太頻繁，請稍後再試'),
};
