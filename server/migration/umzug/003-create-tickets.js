/**
 * tickets：票券碼（事先整批匯入），觀眾用 code 登入
 * code 全域唯一，登入時只需輸入 code 就能對應到活動
 */
const TABLE = 'tickets';

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id            BIGSERIAL PRIMARY KEY,
            room_id       BIGINT      NOT NULL
                          REFERENCES rooms (id) ON DELETE CASCADE,
            code          VARCHAR(64) NOT NULL,
            status        SMALLINT    NOT NULL DEFAULT 1,
            last_login_at TIMESTAMPTZ,
            created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_tickets_code UNIQUE (code)
        )
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_tickets_room_id
        ON ${TABLE} (room_id)
    `);
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
}

module.exports = { up, down };
