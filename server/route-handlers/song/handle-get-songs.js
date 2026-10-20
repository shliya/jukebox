const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        const keyword = String(req.query.q || '')
            .trim()
            .slice(0, 50);
        const songs = await SongService.getSongList(req.ticket, { keyword });
        res.json({ status: 'ok', data: songs });
    } catch (error) {
        sendError(res, error);
    }
};
