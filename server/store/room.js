const { Room } = require('../model');

async function getRoomById(id, { transaction } = {}) {
    return Room.findByPk(id, { transaction });
}

async function getRoomBySlug(slug, { transaction } = {}) {
    return Room.findOne({ where: { slug }, transaction });
}

async function getAllRooms() {
    return Room.findAll({ order: [['id', 'ASC']] });
}

async function updateAllowVotes(id, allowVotes) {
    return Room.update({ allowVotes }, { where: { id } });
}

async function createRoom(row, { transaction } = {}) {
    return Room.create(row, { transaction });
}

module.exports = {
    getRoomById,
    getRoomBySlug,
    getAllRooms,
    updateAllowVotes,
    createRoom,
};
