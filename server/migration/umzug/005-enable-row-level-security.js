/**
 * 所有資料表開啟 RLS（Row Level Security），不建任何 policy
 *
 * 為什麼：Supabase 預設會把 public schema 的表開放給 Data API（anon / authenticated 角色），
 * 拿到 project 網址 + anon key 就能直接讀 tickets 的票券碼。
 * 開 RLS 又沒有 policy → 這些角色一律讀不到、寫不進去。
 *
 * 後端不受影響：我們用資料表擁有者（postgres）連線，擁有者預設不受 RLS 限制。
 * 一般 PostgreSQL（本機 Docker）也能跑，效果相同。
 */
const TABLES = ['rooms', 'songs', 'tickets', 'song_votes', 'schema_migrations'];

/** @param {{ context: import('sequelize').Sequelize }} params */
async function up({ context: sequelize }) {
    for (const table of TABLES) {
        await sequelize.query(
            `ALTER TABLE IF EXISTS ${table} ENABLE ROW LEVEL SECURITY`
        );
    }
}

/** @param {{ context: import('sequelize').Sequelize }} params */
async function down({ context: sequelize }) {
    for (const table of TABLES) {
        await sequelize.query(
            `ALTER TABLE IF EXISTS ${table} DISABLE ROW LEVEL SECURITY`
        );
    }
}

module.exports = { up, down };
