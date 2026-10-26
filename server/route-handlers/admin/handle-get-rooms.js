const AdminService = require('../../service/admin');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        res.json({ status: 'ok', data: await AdminService.getRoomList() });
    } catch (error) {
        sendError(res, error);
    }
};
