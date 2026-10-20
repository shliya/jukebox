const AuthService = require('../../service/auth');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        res.json({ status: 'ok', data: await AuthService.getMe(req.ticket) });
    } catch (error) {
        sendError(res, error);
    }
};
