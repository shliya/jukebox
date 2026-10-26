const AdminService = require('../../service/admin');
const { setAdminCookie } = require('../../lib/admin-session');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        const body = req.body || {};
        const admin = await AdminService.loginAdmin(
            body.username,
            body.password
        );
        setAdminCookie(res, admin.id);
        res.json({ status: 'ok', data: { username: admin.username } });
    } catch (error) {
        sendError(res, error);
    }
};
