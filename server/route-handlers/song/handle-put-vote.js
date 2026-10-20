const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');
const { AppError, INVALID_PARAMS } = require('../../lib/error/code');

module.exports = async (req, res) => {
    try {
        const songId = Number(req.body && req.body.songId);
        if (!Number.isInteger(songId) || songId <= 0) {
            throw new AppError({ ...INVALID_PARAMS, message: '請選擇歌曲' });
        }
        const vote = await SongService.voteSong(req.ticket, songId);
        res.json({ status: 'ok', data: vote });
    } catch (error) {
        sendError(res, error);
    }
};
