const { Admin } = require('../model');

async function getAdminByUsername(username) {
    return Admin.findOne({ where: { username } });
}

async function getAdminById(id) {
    return Admin.findByPk(id);
}

async function touchLastLogin(id) {
    return Admin.update({ lastLoginAt: new Date() }, { where: { id } });
}

module.exports = {
    getAdminByUsername,
    getAdminById,
    touchLastLogin,
};
