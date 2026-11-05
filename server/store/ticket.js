const { QueryTypes } = require('sequelize');
const { Ticket } = require('../model');
const sequelize = require('../config/database');
const { ENUM_TICKET_STATUS, ENUM_TICKET_TYPE } = require('../lib/enum');

const BULK_CHUNK_SIZE = 1000;

async function getTicketByCode(code) {
    return Ticket.findOne({ where: { code } });
}

async function getTicketById(id) {
    return Ticket.findByPk(id);
}

/**
 * 投票進度：可用票券總數、其中已點歌的張數
 * 停用的票不算進分母
 * @returns {Promise<{ ticketCount: number, votedCount: number }>}
 */
async function getVoteProgressByRoomId(roomId) {
    const [row] = await sequelize.query(
        `
        SELECT COUNT(*)::int AS ticket_count,
               COUNT(*) FILTER (
                   WHERE EXISTS (
                       SELECT 1 FROM song_votes v WHERE v.ticket_id = t.id
                   )
               )::int AS voted_count
        FROM tickets t
        WHERE t.room_id = :roomId
          AND t.status = :activeStatus
        `,
        {
            replacements: {
                roomId,
                activeStatus: ENUM_TICKET_STATUS.ACTIVE,
            },
            type: QueryTypes.SELECT,
        }
    );
    return { ticketCount: row.ticket_count, votedCount: row.voted_count };
}

async function touchLastLogin(id) {
    return Ticket.update({ lastLoginAt: new Date() }, { where: { id } });
}

/**
 * 整批匯入票券碼；已存在的 code 會略過（ON CONFLICT DO NOTHING，不會改到既有票的類型）
 * @param {{ type?: number }} [options] 票券類型，預設一般票
 * @returns {Promise<string[]>} 實際新增的 code
 */
async function bulkInsertTicketCodes(
    roomId,
    codes,
    { type = ENUM_TICKET_TYPE.NORMAL } = {}
) {
    const inserted = [];
    await sequelize.transaction(async transaction => {
        for (let i = 0; i < codes.length; i += BULK_CHUNK_SIZE) {
            const chunk = codes.slice(i, i + BULK_CHUNK_SIZE);
            const replacements = { roomId, type };
            const values = chunk.map((code, index) => {
                replacements[`c${index}`] = code;
                return `(:roomId, :c${index}, :type)`;
            });
            const rows = await sequelize.query(
                `
                INSERT INTO tickets (room_id, code, type)
                VALUES ${values.join(', ')}
                ON CONFLICT (code) DO NOTHING
                RETURNING code
                `,
                {
                    replacements,
                    type: QueryTypes.SELECT,
                    transaction,
                }
            );
            inserted.push(...rows.map(row => row.code));
        }
    });
    return inserted;
}

module.exports = {
    getTicketByCode,
    getTicketById,
    getVoteProgressByRoomId,
    touchLastLogin,
    bulkInsertTicketCodes,
};
