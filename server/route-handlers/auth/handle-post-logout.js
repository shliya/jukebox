const { clearSessionCookie } = require('../../lib/ticket-session');

module.exports = (req, res) => {
    clearSessionCookie(res);
    res.json({ status: 'ok' });
};
