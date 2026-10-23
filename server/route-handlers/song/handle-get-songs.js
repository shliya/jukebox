const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

function toPositiveInt(value, fallback) {
    const n = Number(value);
    return Number.isInteger(n) && n > 0 ? n : fallback;
}

module.exports = async (req, res) => {
    try {
        const keyword = String(req.query.q || '')
            .trim()
            .slice(0, 50);
        const tag = String(req.query.tag || '')
            .trim()
            .slice(0, 50);
        const page = toPositiveInt(req.query.page, 1);
        const pageSize = Math.min(
            toPositiveInt(req.query.pageSize, DEFAULT_PAGE_SIZE),
            MAX_PAGE_SIZE
        );
        const result = await SongService.getSongList(req.ticket, {
            tag,
            keyword,
            page,
            pageSize,
        });
        res.json({ status: 'ok', data: result });
    } catch (error) {
        sendError(res, error);
    }
};
