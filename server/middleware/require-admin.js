const AdminService = require('../service/admin');
const { getSessionAdminId, clearAdminCookie } = require('../lib/admin-session');
const { sendError } = require('../lib/send-error');
const { AppError, ADMIN_NOT_LOGGED_IN } = require('../lib/error/code');

/**
 * 需先用管理員帳號登入；通過後 req.admin 為目前管理員
 */
module.exports = async (req, res, next) => {
    try {
        const adminId = getSessionAdminId(req);
        const admin = adminId ? await AdminService.getAdmin(adminId) : null;
        if (!admin) {
            // 帳號被刪除時順便清掉 cookie
            if (adminId) clearAdminCookie(res);
            throw new AppError(ADMIN_NOT_LOGGED_IN);
        }
        req.admin = admin;
        next();
    } catch (error) {
        sendError(res, error);
    }
};
