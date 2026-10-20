/**
 * 票券登入 session：HMAC 簽章的 token 放在 HttpOnly cookie
 * token = base64url(JSON { tid, exp }) + '.' + base64url(HMAC-SHA256)
 */
const crypto = require('crypto');
const { safeEqual } = require('./safe-equal');

const COOKIE_NAME = 'jukebox_ticket';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 小時

function getSecret() {
    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32) {
        throw new Error('SESSION_SECRET 未設定或少於 32 字元');
    }
    return secret;
}

function sign(payload) {
    return crypto
        .createHmac('sha256', getSecret())
        .update(payload)
        .digest('base64url');
}

function createSessionToken(ticketId) {
    const payload = Buffer.from(
        JSON.stringify({
            tid: String(ticketId),
            exp: Date.now() + SESSION_TTL_MS,
        })
    ).toString('base64url');
    return `${payload}.${sign(payload)}`;
}

/** @returns {string|null} ticketId；簽章錯誤或過期回傳 null */
function verifySessionToken(token) {
    if (typeof token !== 'string') return null;
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !safeEqual(signature, sign(payload))) {
        return null;
    }
    try {
        const { tid, exp } = JSON.parse(
            Buffer.from(payload, 'base64url').toString('utf8')
        );
        if (!tid || typeof exp !== 'number' || exp < Date.now()) return null;
        return tid;
    } catch {
        return null;
    }
}

function readCookie(req, name) {
    const header = req.headers.cookie;
    if (!header) return null;
    for (const part of header.split(';')) {
        const index = part.indexOf('=');
        if (index === -1) continue;
        if (part.slice(0, index).trim() === name) {
            return decodeURIComponent(part.slice(index + 1).trim());
        }
    }
    return null;
}

const cookieOptions = () => ({
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
});

function setSessionCookie(res, ticketId) {
    res.cookie(COOKIE_NAME, createSessionToken(ticketId), {
        ...cookieOptions(),
        maxAge: SESSION_TTL_MS,
    });
}

function clearSessionCookie(res) {
    res.clearCookie(COOKIE_NAME, cookieOptions());
}

function getSessionTicketId(req) {
    return verifySessionToken(readCookie(req, COOKIE_NAME));
}

module.exports = {
    getSecret,
    setSessionCookie,
    clearSessionCookie,
    getSessionTicketId,
};
