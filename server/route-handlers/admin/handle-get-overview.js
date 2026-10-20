const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        const overview = await SongService.getAdminOverview(req.params.slug);
        res.json({ status: 'ok', data: overview });
    } catch (error) {
        sendError(res, error);
    }
};
