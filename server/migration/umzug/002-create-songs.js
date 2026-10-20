/**
 * songs：每間點歌房自己的曲庫
 */
const TABLE = 'songs';

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id           BIGSERIAL PRIMARY KEY,
            room_id      BIGINT       NOT NULL
                         REFERENCES rooms (id) ON DELETE CASCADE,
            title        VARCHAR(200) NOT NULL,
            artist       VARCHAR(100),
            source       SMALLINT     NOT NULL DEFAULT 1,
            source_ref   VARCHAR(255),
            duration_sec INTEGER,
            tags         JSONB        NOT NULL DEFAULT '[]'::jsonb,
            is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
            created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
            CONSTRAINT ck_songs_duration_sec
                CHECK (duration_sec IS NULL OR duration_sec >= 0)
        )
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_songs_room_id_is_active
        ON ${TABLE} (room_id, is_active)
    `);
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
}

module.exports = { up, down };
