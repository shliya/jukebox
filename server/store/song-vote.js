const { QueryTypes, Op } = require('sequelize');
const { SongVote, Song } = require('../model');
const sequelize = require('../config/database');

/** 這張票的所有點歌（一張票只點一首，正常只有 1 筆；舊規則留下的資料可能有 2 筆） */
async function getVotesByTicketId(ticketId) {
    return SongVote.findAll({
        where: { ticketId },
        include: [
            { model: Song, as: 'song', attributes: ['id', 'title', 'artist'] },
        ],
    });
}

/**
 * 點歌 / 改選：同類別沒有就新增，已有就更新同一筆的 song_id
 * 單一 SQL 完成，UNIQUE(ticket_id, category) 保證同時送出也只會有一筆
 */
async function upsertVote({ ticketId, songId, category }) {
    const [row] = await sequelize.query(
        `
        INSERT INTO song_votes (ticket_id, song_id, category)
        VALUES (:ticketId, :songId, :category)
        ON CONFLICT (ticket_id, category) DO UPDATE
        SET song_id    = EXCLUDED.song_id,
            updated_at = NOW()
        RETURNING id, ticket_id, song_id, category, created_at, updated_at
        `,
        {
            replacements: { ticketId, songId, category },
            type: QueryTypes.SELECT,
        }
    );
    return row;
}

/** 刪掉這張票其他類別的點歌（一張票只留一首用） */
async function deleteVotesByTicketIdExceptCategory(ticketId, category) {
    return SongVote.destroy({
        where: { ticketId, category: { [Op.ne]: category } },
    });
}

/**
 * 清空某個活動的所有點歌（一般、合唱都清，後台重置選歌用）
 * song_votes 沒有 room_id，透過 tickets 對應活動
 * @returns {Promise<number>} 刪除筆數
 */
async function deleteVotesByRoomId(roomId) {
    const rows = await sequelize.query(
        `
        DELETE FROM song_votes v
        USING tickets t
        WHERE t.id = v.ticket_id
          AND t.room_id = :roomId
        RETURNING v.id
        `,
        { replacements: { roomId }, type: QueryTypes.SELECT }
    );
    return rows.length;
}

module.exports = {
    getVotesByTicketId,
    upsertVote,
    deleteVotesByTicketIdExceptCategory,
    deleteVotesByRoomId,
};
