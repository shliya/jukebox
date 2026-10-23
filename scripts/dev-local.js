/**
 * 本機一鍵測試：起資料庫 → migration →（可選）示範資料 → 前後端開發伺服器
 *
 *   npm run dev:local            一般啟動
 *   npm run dev:local -- --seed  順便塞示範資料（活動 demo、26 首歌、票券 DEMO-0001~0005）
 *
 * 環境變數：有 .env 就用 .env；沒設定的才用下面的本機預設值。
 * 這支腳本不會建立或修改 .env。
 */
require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = new Set(process.argv.slice(2));

if (process.env.NODE_ENV === 'production') {
    console.error(
        '[dev:local] NODE_ENV=production，這支只給本機測試用，已停止'
    );
    process.exit(1);
}

// 沒設定的才補本機預設值（不覆蓋 .env）
const LOCAL_DEFAULTS = {
    NODE_ENV: 'development',
    PORT: '3002',
    // 對應 docker-compose.yml
    TEST_DB_URL: 'postgres://postgres:postgres@localhost:5433/jukebox_dev',
    // 每次啟動隨機一組；同一次執行中 nodemon 重啟會沿用，不會被登出
    SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
};
const usedDefaults = [];
for (const [key, value] of Object.entries(LOCAL_DEFAULTS)) {
    if (!process.env[key]) {
        process.env[key] = value;
        usedDefaults.push(key);
    }
}

const isWindows = process.platform === 'win32';

function run(label, command, commandArgs) {
    console.log(`\n[dev:local] ${label}`);
    const result = spawnSync(command, commandArgs, {
        cwd: ROOT,
        env: process.env,
        stdio: 'inherit',
        shell: isWindows,
    });
    if (result.error || result.status !== 0) {
        console.error(`[dev:local] 「${label}」失敗，已停止`);
        process.exit(result.status || 1);
    }
}

function usesComposeDatabase() {
    try {
        const { hostname, port } = new URL(process.env.TEST_DB_URL);
        return ['localhost', '127.0.0.1'].includes(hostname) && port === '5433';
    } catch {
        return false;
    }
}

// 1. 資料庫：連的是 docker-compose 那顆才幫忙啟動
if (usesComposeDatabase()) {
    run('啟動 Docker 資料庫（jukebox-postgres）', 'docker', [
        'compose',
        'up',
        '-d',
        '--wait',
    ]);
} else {
    console.log(
        '\n[dev:local] TEST_DB_URL 不是 docker-compose 的資料庫，略過啟動 Docker'
    );
}

// 2. migration
run('執行 migration', 'node', ['server/migration/migrate.js', 'up']);

// 3. 示範資料（可選）
if (args.has('--seed')) {
    run('塞示範資料', 'node', ['server/lib/script/seed-demo.js']);
}

// 4. 前後端開發伺服器
const port = process.env.PORT;
console.log(`
[dev:local] 啟動中…
  點歌頁      http://localhost:8080/（手機請橫放）
  後端 API    http://localhost:${port}/api/v1/health
  測試票券    DEMO-0001 ~ DEMO-0005（需先跑過 --seed）
${usedDefaults.length ? `  使用本機預設值：${usedDefaults.join('、')}\n` : ''}  按 Ctrl+C 結束
`);

const dev = spawn('npm', ['run', 'dev-web'], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
    shell: isWindows,
});

// 自己按 Ctrl+C 結束時一律回 0（taskkill /F 會讓子程序回非 0，不代表出錯）
dev.on('exit', code => process.exit(stopping ? 0 : (code ?? 0)));

/**
 * 結束時把整個程序樹一起關掉（npm → concurrently → nodemon / webpack）。
 * Windows 的 kill 只會關掉最外層，裡面的伺服器會繼續佔著 port，所以用 taskkill /T。
 */
let stopping = false;
function stopAll(signal) {
    if (stopping) return;
    stopping = true;
    if (isWindows) {
        spawnSync('taskkill', ['/T', '/F', '/PID', String(dev.pid)], {
            stdio: 'ignore',
        });
    } else {
        dev.kill(signal);
    }
}

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => stopAll(signal));
}
process.on('exit', () => stopAll('SIGTERM'));
