const { QueryTypes } = require('sequelize');
const { Song } = require('../model');
const sequelize = require('../config/database');

/**
 * 歌單 + 票數，依票數排序
 *   票數高 → 低；同票數時先達到的（最早一票較早）排前面；再依歌名
 * @param {number|string} roomId
 * @param {{ keyword?: string, onlyVoted?: boolean, limit?: number }} [options]
 *   onlyVoted=true 時只列有人點的歌（排行榜）
 */
async function getSongRankingByRoomId(
    roomId,
    { keyword = '', onlyVoted = false, limit = 200 } = {}
) {
    const rows = await sequelize.query(
        `
        SELECT
            s.id,
            s.title,
            s.artist,
            s.duration_sec,
            COALESCE(c.vote_count, 0) AS vote_count
        FROM songs s
        LEFT JOIN (
            SELECT song_id,
                   COUNT(*)::int   AS vote_count,
                   MIN(updated_at) AS first_voted_at
            FROM song_votes
            GROUP BY song_id
        ) c ON c.song_id = s.id
        WHERE s.room_id = :roomId
          AND s.is_active = TRUE
          AND (
                :keyword = ''
                OR s.title  ILIKE :like
                OR s.artist ILIKE :like
              )
          ${onlyVoted ? 'AND c.vote_count > 0' : ''}
        ORDER BY vote_count DESC, c.first_voted_at ASC NULLS LAST, s.title ASC
        LIMIT :limit
        `,
        {
            replacements: {
                roomId,
                keyword,
                like: `%${keyword.replace(/[\\%_]/g, '\\$&')}%`,
                limit,
            },
            type: QueryTypes.SELECT,
        }
    );
    return rows.map(row => ({
        id: Number(row.id),
        title: row.title,
        artist: row.artist,
        durationSec: row.duration_sec,
        voteCount: row.vote_count,
    }));
}

/**
 * 歌單分頁（伴唱機畫面用）：依編號排序，翻頁時順序固定不跳動
 * @param {number|string} roomId
 * @param {{ tag?: string, keyword?: string, page: number, pageSize: number }} options
 *   tag 有值時只列 tags 含該分類的歌（例如「合唱」）
 * @returns {Promise<{ items: Array, total: number }>}
 */
async function getSongPageByRoomId(
    roomId,
    { tag = '', keyword = '', page, pageSize }
) {
    const where = `
        WHERE s.room_id = :roomId
          AND s.is_active = TRUE
          AND (:tag = '' OR s.tags @> jsonb_build_array(CAST(:tag AS text)))
          AND (
                :keyword = ''
                OR s.title  ILIKE :like
                OR s.artist ILIKE :like
              )
    `;
    const replacements = {
        roomId,
        tag,
        keyword,
        like: `%${keyword.replace(/[\\%_]/g, '\\$&')}%`,
        limit: pageSize,
        offset: (page - 1) * pageSize,
    };

    const [{ total }] = await sequelize.query(
        `SELECT COUNT(*)::int AS total FROM songs s ${where}`,
        { replacements, type: QueryTypes.SELECT }
    );
    const rows = await sequelize.query(
        `
        SELECT s.id, s.title, s.artist, s.duration_sec, s.tags
        FROM songs s
        ${where}
        ORDER BY s.id ASC
        LIMIT :limit OFFSET :offset
        `,
        { replacements, type: QueryTypes.SELECT }
    );
    return {
        total,
        items: rows.map(row => ({
            id: Number(row.id),
            title: row.title,
            artist: row.artist,
            durationSec: row.duration_sec,
            tags: row.tags,
        })),
    };
}

async function getActiveSongByIdAndRoomId(id, roomId, { transaction } = {}) {
    return Song.findOne({
        where: { id, roomId, isActive: true },
        transaction,
    });
}

module.exports = {
    getSongRankingByRoomId,
    getSongPageByRoomId,
    getActiveSongByIdAndRoomId,
};
