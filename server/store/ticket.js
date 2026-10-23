const { QueryTypes } = require('sequelize');
const { Ticket } = require('../model');
const sequelize = require('../config/database');

const BULK_CHUNK_SIZE = 1000;

async function getTicketByCode(code) {
    return Ticket.findOne({ where: { code } });
}

async function getTicketById(id) {
    return Ticket.findByPk(id);
}

async function touchLastLogin(id) {
    return Ticket.update({ lastLoginAt: new Date() }, { where: { id } });
}

/**
 * 整批匯入票券碼；已存在的 code 會略過（ON CONFLICT DO NOTHING）
 * @returns {Promise<string[]>} 實際新增的 code
 */
async function bulkInsertTicketCodes(roomId, codes) {
    const inserted = [];
    await sequelize.transaction(async transaction => {
        for (let i = 0; i < codes.length; i += BULK_CHUNK_SIZE) {
            const chunk = codes.slice(i, i + BULK_CHUNK_SIZE);
            const replacements = { roomId };
            const values = chunk.map((code, index) => {
                replacements[`c${index}`] = code;
                return `(:roomId, :c${index})`;
            });
            const rows = await sequelize.query(
                `
                INSERT INTO tickets (room_id, code)
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
    touchLastLogin,
    bulkInsertTicketCodes,
};
