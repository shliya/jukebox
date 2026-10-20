const sequelize = require('../../config/database');
const { getSafeApiErrorMessage } = require('../../lib/safe-error-message');

module.exports = async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({
            status: 'ok',
            database: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            database: 'error',
            message: getSafeApiErrorMessage(error),
        });
    }
};
