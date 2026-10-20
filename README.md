# 點歌機

票券碼登入的點歌系統：票券碼事先整批匯入資料庫，觀眾輸入票券碼登入後從歌單點歌，
**一張票只算一首**（可以改選，改選是更新同一筆資料），排行榜依票數（`COUNT ... ORDER BY DESC`）排序。

Node.js + Express + PostgreSQL（Sequelize / Umzug）+ webpack 多頁前端，資料夾結構沿用 `ecpay-web`。

## 快速開始

```powershell
npm install
copy .env.example .env      # 填入 TEST_DB_URL、SESSION_SECRET、ADMIN_TOKEN
npm run migrate             # 建表
npm run seed                # 示範活動 demo + 4 首歌 + 測試票 DEMO-0001 ~ DEMO-0005（可選）
npm run dev-web             # express :3002 + webpack dev server :8080
```

- 觀眾：http://localhost:8080/ → 輸入票券碼（例如 `DEMO-0001`）
- 管理：http://localhost:8080/admin.html?room=demo（右上角輸入 ADMIN_TOKEN）

## 票券碼匯入

票券碼必須先寫進資料庫，觀眾才能登入。已存在的碼一律略過，可重複執行。

```powershell
# 從檔案匯入：每行一個碼（CSV 取第一欄，第一行是 code 標題會自動略過）
npm run tickets:import -- --room demo --file ./tickets.csv

# 直接產生 300 組隨機碼（XXXXX-XXXXX）匯入，並輸出成 CSV 拿去印票
npm run tickets:import -- --room demo --generate 300 --out ./tickets-demo.csv

# 活動不存在時加 --name 自動建立
npm run tickets:import -- --room live-1015 --name "10/15 演唱會" --generate 300 --out ./t.csv
```

票券碼會統一去空白、轉大寫，格式限 `A-Z 0-9 -`，4 ~ 64 字。

## 資料表

```
rooms 1 ─┬─ * songs 1 ─── * song_votes
         └─ * tickets 1 ── 0..1 song_votes   (ticket_id UNIQUE → 一張票一筆，改選 = UPDATE song_id)
```

| 表 | 說明 |
|---|---|
| `rooms` | 點歌活動：`slug`、`name`、`status`、`allow_votes`（關閉後不能再點） |
| `songs` | 歌單：`room_id`、`title`、`artist`、`source`、`source_ref`、`duration_sec`、`tags`、`is_active` |
| `tickets` | 票券：`room_id`、`code`（UNIQUE）、`status`（0 停用 / 1 可用）、`last_login_at` |
| `song_votes` | 票券 → 歌曲：`ticket_id`（UNIQUE）、`song_id`、`created_at`（第一次點）、`updated_at`（投給目前這首的時間） |
| `schema_migrations` | Umzug 執行紀錄 |

排行榜（[server/store/song.js](server/store/song.js)）：

```sql
SELECT s.*, COALESCE(c.vote_count, 0) AS vote_count
FROM songs s
LEFT JOIN (
    SELECT song_id, COUNT(*) AS vote_count, MIN(updated_at) AS first_voted_at
    FROM song_votes GROUP BY song_id
) c ON c.song_id = s.id
WHERE s.room_id = :roomId AND s.is_active
ORDER BY vote_count DESC, first_voted_at ASC NULLS LAST, s.title
```

同票數時，先拿到票的歌排前面（改選的票以改選時間計）。

點歌 / 改選（[server/store/song-vote.js](server/store/song-vote.js)），一條 SQL 完成，同時送出也只會有一筆：

```sql
INSERT INTO song_votes (ticket_id, song_id) VALUES (:ticketId, :songId)
ON CONFLICT (ticket_id) DO UPDATE SET song_id = EXCLUDED.song_id, updated_at = NOW()
```

選到跟目前同一首時不寫入（不刷新 updated_at）。

## 登入機制

- `POST /auth/login` 驗證票券碼 → 發 HttpOnly cookie（HMAC 簽章，12 小時，`SESSION_SECRET` 簽）
- 之後每個請求都會重新確認票券仍存在且未停用；停用票券會立即失效
- 登入 API 每 IP 每分鐘限 10 次，防止暴力猜碼

## API（/api/v1）

| Method | Path | 權限 | 說明 |
|---|---|---|---|
| GET | `/health` | - | 服務 + DB 狀態 |
| POST | `/auth/login` | - | 票券登入 `{ code }` |
| POST | `/auth/logout` | - | 登出 |
| GET | `/auth/me` | 票券 | 票券、活動、自己點的歌 |
| GET | `/songs?q=` | 票券 | 歌單（含票數，依票數排序，可搜尋） |
| GET | `/songs/ranking` | 票券 | 排行榜前 20（只列有票的） |
| PUT | `/songs/vote` | 票券 | 點歌 / 改選 `{ songId }`，回傳 `previousSongId`、`changed` |
| GET | `/admin/rooms/:slug` | admin | 排行榜 + 票券統計（總數 / 已登入 / 已點歌） |
| POST | `/admin/rooms/:slug/songs` | admin | 新增歌曲 `{ title, artist?, durationSec?, tags? }` |

admin = header `x-admin-token` 等於 `ADMIN_TOKEN`（暫時方案）。

## 目錄結構

```
app/                     前端（webpack 入口：index 觀眾、admin 管理）
server/
  config/database.js     Sequelize 連線（production → DATABASE_URL，其他 → TEST_DB_URL）
  migration/umzug/       001 rooms / 002 songs / 003 tickets / 004 song_votes
  model/                 schema/ 一表一檔，index.js 設關聯
  store/                 DB 存取（排行榜 SQL、票券整批寫入）
  service/               商業邏輯（登入、點歌一次限制、活動開關）
  route-handlers/        解析參數 → service → 回應
  routes/jukebox/        路由，掛在 /api/v1
  middleware/            require-ticket、require-admin、rate-limit
  lib/                   enum、錯誤碼、ticket-session、ticket-code、script/（seed、匯入票券）
```

## Migration

```powershell
npm run migrate            # 執行待跑的 migration
npm run migrate:status     # 已執行 / 待執行
npm run migrate:down       # 回滾最後一支
```

新增 migration：在 `server/migration/umzug/` 建 `005-xxx.js`，匯出 `up({ context: sequelize })` / `down(...)`。
已上線的 migration 不要改，改 schema 一律新增一支。
