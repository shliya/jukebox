const AdminService = require('../../service/admin');
const { sendError } = require('../../lib/send-error');
const { AppError, INVALID_PARAMS } = require('../../lib/error/code');

module.exports = async (req, res) => {
    try {
        const roomId = Number(req.params.roomId);
        const allowVotes = req.body && req.body.allowVotes;
        if (!Number.isInteger(roomId) || roomId <= 0) {
            throw new AppError(INVALID_PARAMS);
        }
        if (typeof allowVotes !== 'boolean') {
            throw new AppError({
                ...INVALID_PARAMS,
                message: 'allowVotes 必須是 true / false',
            });
        }
        await AdminService.setAllowVotes(roomId, allowVotes);
        res.json({ status: 'ok', data: { allowVotes } });
    } catch (error) {
        sendError(res, error);
    }
};
