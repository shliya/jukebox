const { QueryTypes } = require('sequelize');
const { SongVote, Song } = require('../model');
const sequelize = require('../config/database');

async function getVoteByTicketId(ticketId) {
    return SongVote.findOne({
        where: { ticketId },
        include: [
            { model: Song, as: 'song', attributes: ['id', 'title', 'artist'] },
        ],
    });
}

/**
 * 點歌 / 改選：沒有就新增，已有就更新同一筆的 song_id
 * 單一 SQL 完成，UNIQUE(ticket_id) 保證同時送出也只會有一筆
 */
async function upsertVote({ ticketId, songId }) {
    const [row] = await sequelize.query(
        `
        INSERT INTO song_votes (ticket_id, song_id)
        VALUES (:ticketId, :songId)
        ON CONFLICT (ticket_id) DO UPDATE
        SET song_id    = EXCLUDED.song_id,
            updated_at = NOW()
        RETURNING id, ticket_id, song_id, created_at, updated_at
        `,
        { replacements: { ticketId, songId }, type: QueryTypes.SELECT }
    );
    return row;
}

module.exports = {
    getVoteByTicketId,
    upsertVote,
};
