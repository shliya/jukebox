const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        const ranking = await SongService.getRankingByRoomId(
            req.ticket.roomId,
            { limit: 20 }
        );
        res.json({ status: 'ok', data: ranking });
    } catch (error) {
        sendError(res, error);
    }
};
