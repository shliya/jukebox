/**
 * 管理員登入 session（cookie：jukebox_admin，12 小時）
 */
const { createSignedSession } = require('./signed-session');

const session = createSignedSession({
    cookieName: 'jukebox_admin',
    idKey: 'aid',
    ttlMs: 12 * 60 * 60 * 1000,
});

module.exports = {
    setAdminCookie: session.setCookie,
    clearAdminCookie: session.clearCookie,
    getSessionAdminId: session.getId,
};
