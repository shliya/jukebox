/**
 * song_votes：票券對應歌曲（點歌）
 * ticket_id UNIQUE → 一張票永遠只有一筆，改選歌曲是 UPDATE 同一筆的 song_id
 * created_at = 第一次點歌時間；updated_at = 投給目前這首歌的時間（排行榜同票數時用）
 * 排行榜 = 各歌曲 COUNT(song_votes) ORDER BY DESC
 */
const TABLE = 'song_votes';

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.query(`
        CREATE TABLE IF NOT EXISTS ${TABLE} (
            id         BIGSERIAL PRIMARY KEY,
            ticket_id  BIGINT      NOT NULL
                       REFERENCES tickets (id) ON DELETE CASCADE,
            song_id    BIGINT      NOT NULL
                       REFERENCES songs (id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            CONSTRAINT uq_song_votes_ticket_id UNIQUE (ticket_id)
        )
    `);
    await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_song_votes_song_id
        ON ${TABLE} (song_id)
    `);
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    await sequelize.query(`DROP TABLE IF EXISTS ${TABLE}`);
}

module.exports = { up, down };
