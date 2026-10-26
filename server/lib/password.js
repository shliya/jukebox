/**
 * 密碼雜湊：scrypt（Node 內建，不用額外套件）
 * 存成 scrypt$<salt hex>$<hash hex>
 */
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
    const salt = crypto.randomBytes(16);
    const hash = await scrypt(String(password), salt, KEY_LENGTH);
    return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

async function verifyPassword(password, stored) {
    const [scheme, saltHex, hashHex] = String(stored || '').split('$');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scrypt(
        String(password),
        Buffer.from(saltHex, 'hex'),
        expected.length
    );
    return crypto.timingSafeEqual(actual, expected);
}

module.exports = {
    hashPassword,
    verifyPassword,
};
