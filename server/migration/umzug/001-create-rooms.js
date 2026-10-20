/**
 * rooms：點歌活動（票券、歌單都掛在某個活動底下）
 */
const TABLE = 'rooms';

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id          BIGSERIAL PRIMARY KEY,
            slug        VARCHAR(50)  NOT NULL,
            name        VARCHAR(100) NOT NULL,
            description TEXT,
            status      SMALLINT     NOT NULL DEFAULT 1,
            allow_votes BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_rooms_slug UNIQUE (slug)
        )
    `);
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
}

module.exports = { up, down };
