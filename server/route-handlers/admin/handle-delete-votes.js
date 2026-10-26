const AdminService = require('../../service/admin');
const { sendError } = require('../../lib/send-error');
const { AppError, INVALID_PARAMS } = require('../../lib/error/code');

module.exports = async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        if (!Number.isInteger(roomId) || roomId <= 0) {
            throw new AppError(INVALID_PARAMS);
        }
        const deleted = await AdminService.resetGeneralVotes(roomId);
        res.json({ status: 'ok', data: { deleted } });
    } catch (error) {
        sendError(res, error);
    }
};
