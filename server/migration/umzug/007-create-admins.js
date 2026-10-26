/**
 * admins：後台管理員帳號（密碼存 scrypt 雜湊，不存明碼）
 * 建表時一併建立預設管理員 adminhamster（已存在就略過，不會覆蓋改過的密碼）
 */
const { hashPassword } = require('../../lib/password');

const TABLE = 'admins';
const DEFAULT_ADMIN = 'adminhamster';

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id            BIGSERIAL PRIMARY KEY,
            username      VARCHAR(50)  NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            last_login_at TIMESTAMPTZ,
            created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_admins_username UNIQUE (username)
        )
    `);
    // 跟 005 一樣：擋掉 Supabase Data API（anon key）直接讀管理員資料
    await sequelize.query(`ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`);
    await sequelize.query(
        `
        INSERT INTO ${TABLE} (username, password_hash)
        VALUES (:username, :passwordHash)
        ON CONFLICT (username) DO NOTHING
        `,
        {
            replacements: {
                username: DEFAULT_ADMIN,
                passwordHash: await hashPassword(DEFAULT_ADMIN),
            },
        }
    );
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
}

module.exports = { up, down };
