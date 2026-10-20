const crypto = require('crypto');

// 排除容易看錯的 0/O、1/I/L
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_PATTERN = /^[A-Z0-9-]{4,64}$/;

/** 統一格式：去空白、轉大寫 */
function normalizeTicketCode(raw) {
    return String(raw || '')
        .replace(/\s+/g, '')
        .toUpperCase();
}

function isValidTicketCode(code) {
    return CODE_PATTERN.test(code);
}

/** 產生 XXXXX-XXXXX 格式的隨機票券碼 */
function generateTicketCode(groups = 2, groupLength = 5) {
    const parts = [];
    for (let g = 0; g < groups; g++) {
        let part = '';
        for (let i = 0; i < groupLength; i++) {
            part += ALPHABET[crypto.randomInt(ALPHABET.length)];
        }
        parts.push(part);
    }
    return parts.join('-');
}

module.exports = {
    normalizeTicketCode,
    isValidTicketCode,
    generateTicketCode,
};
