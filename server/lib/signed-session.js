/**
 * HMAC 簽章的 session token，放在 HttpOnly cookie
 * token = base64url(JSON { [idKey], exp }) + '.' + base64url(HMAC-SHA256)
 * 票券、管理員各用不同 cookie 與 idKey，彼此的 token 不能混用
 */
const crypto = require('crypto');
const { safeEqual } = require('./safe-equal');

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

/**
 * @param {{ cookieName: string, idKey: string, ttlMs: number }} options
 */
function createSignedSession({ cookieName, idKey, ttlMs }) {
    function createToken(id) {
        const payload = Buffer.from(
            JSON.stringify({ [idKey]: String(id), exp: Date.now() + ttlMs })
        ).toString('base64url');
        return `${payload}.${sign(payload)}`;
    }

    /** @returns {string|null} id；簽章錯誤或過期回傳 null */
    function verifyToken(token) {
        if (typeof token !== 'string') return null;
        const [payload, signature] = token.split('.');
        if (!payload || !signature || !safeEqual(signature, sign(payload))) {
            return null;
        }
        try {
            const data = JSON.parse(
                Buffer.from(payload, 'base64url').toString('utf8')
            );
            const id = data[idKey];
            if (!id || typeof data.exp !== 'number' || data.exp < Date.now()) {
                return null;
            }
            return id;
        } catch {
            return null;
        }
    }

    return {
        setCookie(res, id) {
            res.cookie(cookieName, createToken(id), {
                ...cookieOptions(),
                maxAge: ttlMs,
            });
        },
        clearCookie(res) {
            res.clearCookie(cookieName, cookieOptions());
        },
        getId(req) {
            return verifyToken(readCookie(req, cookieName));
        },
    };
}

module.exports = {
    getSecret,
    createSignedSession,
};
