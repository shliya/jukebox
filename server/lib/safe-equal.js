const crypto = require('crypto');

/** 固定時間比較字串，避免 timing attack */
function safeEqual(a, b) {
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    if (bufA.length !== bufB.length) {
        return false;
    }
    return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = { safeEqual };
