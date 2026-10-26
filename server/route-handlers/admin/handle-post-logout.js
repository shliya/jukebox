const { clearAdminCookie } = require('../../lib/admin-session');

module.exports = (req, res) => {
    clearAdminCookie(res);
    res.json({ status: 'ok' });
};
