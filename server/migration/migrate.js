/**
 * Umzug migration CLI
 *
 * 用法：
 *   node server/migration/migrate.js up
 *   node server/migration/migrate.js down      （回滾最後一支）
 *   node server/migration/migrate.js status
 *   node server/migration/migrate.js pending
 *   node server/migration/migrate.js executed
 */
require('dotenv').config();

const { createUmzug, sequelize } = require('./create-umzug');

function printUsage() {
    console.log(`
Umzug migration 指令：

  node server/migration/migrate.js up        執行尚未套用的 migration
  node server/migration/migrate.js down      回滾最後一支 migration
  node server/migration/migrate.js status    列出已執行 / 待執行
  node server/migration/migrate.js pending   僅列出待執行
  node server/migration/migrate.js executed  僅列出已執行

環境：
  NODE_ENV=production  → 使用 DATABASE_URL
  其他                 → 使用 TEST_DB_URL
`);
}

function printList(title, list) {
    console.log(`--- ${title} ---`);
    if (list.length === 0) {
        console.log('（無）');
    } else {
        list.forEach(m => console.log(`  ${m.name}`));
    }
}

async function main() {
    const command = (process.argv[2] || 'up').trim().toLowerCase();
    const umzug = createUmzug();

    const dbHint =
        process.env.NODE_ENV === 'production' ? 'DATABASE_URL' : 'TEST_DB_URL';
    console.log(
        `[migrate] NODE_ENV=${process.env.NODE_ENV || '(未設定)'} → ${dbHint}\n`
    );

    try {
        switch (command) {
            case 'up': {
                const executed = await umzug.up();
                printList('本次執行', executed);
                break;
            }
            case 'down': {
                const reverted = await umzug.down();
                printList('本次回滾', reverted);
                break;
            }
            case 'status':
                printList('已執行', await umzug.executed());
                printList('待執行', await umzug.pending());
                break;
            case 'pending':
                printList('待執行', await umzug.pending());
                break;
            case 'executed':
                printList('已執行', await umzug.executed());
                break;
            default:
                printUsage();
                process.exitCode = 1;
        }
    } catch (error) {
        console.error('[migrate] 失敗:', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
