/**
 * 票券登入 session（cookie：jukebox_ticket，12 小時）
 */
const { getSecret, createSignedSession } = require('./signed-session');

const session = createSignedSession({
    cookieName: 'jukebox_ticket',
    idKey: 'tid',
    ttlMs: 12 * 60 * 60 * 1000,
});

module.exports = {
    getSecret,
    setSessionCookie: session.setCookie,
    clearSessionCookie: session.clearCookie,
    getSessionTicketId: session.getId,
};
