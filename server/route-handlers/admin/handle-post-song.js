const SongService = require('../../service/song');
const { sendError } = require('../../lib/send-error');
const { AppError, INVALID_PARAMS } = require('../../lib/error/code');

function parseBody(body = {}) {
    const title = String(body.title || '').trim();
    const artist = String(body.artist || '').trim();
    const durationSec =
        body.durationSec === undefined || body.durationSec === ''
            ? null
            : Number(body.durationSec);
    const tags = Array.isArray(body.tags)
        ? body.tags.map(t => String(t).trim()).filter(Boolean)
        : [];

    if (!title || title.length > 200 || artist.length > 100) {
        throw new AppError({
            ...INVALID_PARAMS,
            message: '歌名或歌手格式錯誤',
        });
    }
    if (
        durationSec !== null &&
        (!Number.isInteger(durationSec) || durationSec < 0)
    ) {
        throw new AppError({ ...INVALID_PARAMS, message: '歌曲長度格式錯誤' });
    }
    return { title, artist, durationSec, tags };
}

module.exports = async (req, res) => {
    try {
        const song = await SongService.createSong(
            req.params.slug,
            parseBody(req.body)
        );
        res.status(201).json({ status: 'ok', data: song });
    } catch (error) {
        sendError(res, error);
    }
};
