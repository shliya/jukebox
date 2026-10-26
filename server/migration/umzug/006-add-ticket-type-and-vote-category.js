/**
 * 特殊票可以多點一首合唱
 *
 * tickets.type：1 一般票 / 2 特殊票
 * song_votes.category：1 一般歌曲 / 2 合唱歌曲
 * UNIQUE(ticket_id) 改成 UNIQUE(ticket_id, category)
 *   → 一般票只會有 category=1 一筆；特殊票一般、合唱各最多一筆，改選仍是 UPDATE 同一筆
 */

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    await sequelize.transaction(async transaction => {
        await sequelize.query(
            `ALTER TABLE tickets
             ADD COLUMN IF NOT EXISTS type SMALLINT NOT NULL DEFAULT 1`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE song_votes
             ADD COLUMN IF NOT EXISTS category SMALLINT NOT NULL DEFAULT 1`,
            { transaction }
        );
        // 既有的票如果投給合唱歌，歸到合唱類
        await sequelize.query(
            `UPDATE song_votes v
             SET category = 2
             FROM songs s
             WHERE s.id = v.song_id
               AND s.tags @> '["合唱"]'::jsonb`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE song_votes
             DROP CONSTRAINT IF EXISTS uq_song_votes_ticket_id`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE song_votes
             ADD CONSTRAINT uq_song_votes_ticket_id_category
             UNIQUE (ticket_id, category)`,
            { transaction }
        );
    });
}

/**
 * 回滾會刪掉所有合唱類的點歌紀錄（舊結構一張票只能有一筆）
 * @param {{ context: import('sequelize').Sequelize }} params
 */
async function down({ context: sequelize }) {
    await sequelize.transaction(async transaction => {
        await sequelize.query(`DELETE FROM song_votes WHERE category <> 1`, {
            transaction,
        });
        await sequelize.query(
            `ALTER TABLE song_votes
             DROP CONSTRAINT IF EXISTS uq_song_votes_ticket_id_category`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE song_votes
             ADD CONSTRAINT uq_song_votes_ticket_id UNIQUE (ticket_id)`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE song_votes DROP COLUMN IF EXISTS category`,
            { transaction }
        );
        await sequelize.query(
            `ALTER TABLE tickets DROP COLUMN IF EXISTS type`,
            { transaction }
        );
    });
}

module.exports = { up, down };
