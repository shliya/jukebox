const { safeEqual } = require('../lib/safe-equal');

/**
 * 暫時的管理權限：header x-admin-token 需等於 ADMIN_TOKEN。
 * 之後接正式登入（如 better-auth）時替換這支即可。
 */
module.exports = (req, res, next) => {
    const expected = process.env.ADMIN_TOKEN;
    const token = req.get('x-admin-token');
    if (!expected || !token || !safeEqual(token, expected)) {
        return res.status(401).json({ status: 'error', message: '未授權' });
    }
    next();
};
