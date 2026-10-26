# 點歌機

票券碼登入的點歌系統：票券碼事先整批匯入資料庫，觀眾輸入票券碼登入後從歌單點歌，
**一張票只算一首**（可以改選，改選是更新同一筆資料），排行榜依票數（`COUNT ... ORDER BY DESC`）排序。
特殊票另外可以點一首合唱（tags 含 `合唱` 的歌），代表持票人上台跟歌手合唱這首：同一首可以多人點、可以改選，
不列入排行榜；一般票看得到合唱歌單但不能點。

Node.js + Express + PostgreSQL（Sequelize / Umzug）+ webpack 前端，資料夾結構沿用 `ecpay-web`。
觀眾點歌頁（只支援橫向）＋ 後台 `/admin`（停止 / 開放點歌、重置選歌、看投票進度）；歌單與票券都直接匯入資料庫。

## 本機測試（一鍵啟動）

需要先開 Docker Desktop。

```powershell
npm install
npm run dev:local -- --seed   # 第一次：連示範資料一起建
npm run dev:local             # 之後：直接啟動
```

`dev:local`（[scripts/dev-local.js](scripts/dev-local.js)）會依序：

1. 啟動 Docker 資料庫 `jukebox-postgres`（[docker-compose.yml](docker-compose.yml)，port 5433）
2. 執行 migration
3. 加 `--seed` 時塞示範資料：活動 demo、26 首歌、一般測試票 `DEMO-0001` ~ `DEMO-0005`、特殊測試票 `DEMO-DUET`
4. 同時啟動後端（nodemon，改程式自動重啟，:3002）與前端（webpack dev server，:8080）

- 點歌頁：http://localhost:8080/ → 輸入票券碼（例如 `DEMO-0001`），手機請橫放
- 後台：http://localhost:8080/admin.html（express 直接跑時是 http://localhost:3002/admin），帳號密碼都是 `adminhamster`
- 按 Ctrl+C 會把資料庫以外的程序全部關掉；資料庫要關用 `docker compose stop`

不需要 `.env` 也能跑：沒設定的變數會用本機預設值（`TEST_DB_URL` 指向上面的 Docker、
`SESSION_SECRET` 每次啟動隨機產生）。
有 `.env` 時以 `.env` 為準，腳本不會建立或修改 `.env`。

### 手動啟動

```powershell
copy .env.example .env      # 填入 TEST_DB_URL、SESSION_SECRET
docker compose up -d        # 本機資料庫
npm run migrate             # 建表
npm run seed                # 示範資料（可選）
npm run dev-web             # express :3002 + webpack dev server :8080
```

## 票券碼匯入

票券碼必須先寫進資料庫，觀眾才能登入。已存在的碼一律略過，可重複執行。

```powershell
# 從檔案匯入：每行一個碼（CSV 取第一欄，第一行是 code 標題會自動略過）
npm run tickets:import -- --room demo --file ./tickets.csv

# 直接產生 300 組隨機碼（XXXXX-XXXXX）匯入，並輸出成 CSV 拿去印票
npm run tickets:import -- --room demo --generate 300 --out ./tickets-demo.csv

# 活動不存在時加 --name 自動建立
npm run tickets:import -- --room live-1015 --name "10/15 演唱會" --generate 300 --out ./t.csv

# 特殊票（一般、合唱各可點一首）
npm run tickets:import -- --room demo --generate 20 --type special --out ./t-special.csv
```

已經匯入的票要改成特殊票，直接改資料庫：

```sql
UPDATE tickets SET type = 2 WHERE code IN ('XXXXX-XXXXX', 'YYYYY-YYYYY');
```

票券碼會統一去空白、轉大寫，格式限 `A-Z 0-9 -`，4 ~ 64 字。

## 後台

`/admin`，管理員帳號存在 `admins` 表（密碼是 scrypt 雜湊，不存明碼）。
migration 007 會建立預設帳號 `adminhamster`（密碼同帳號）；已存在就略過，不會覆蓋。

| 功能            | 說明                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| 停止 / 開放點歌 | 切換 `rooms.allow_votes`；停止時觀眾畫面歌單會被擋板蓋住、點歌 API 回 403 |
| 重置選歌        | 清空該活動的一般點歌（下一輪投票用），合唱點歌保留                        |
| 投票進度        | 已投票 / 可用票券總數，每 5 秒自動更新                                    |

觀眾頁每 5 秒同步一次 `/auth/me`，後台停止點歌或重置後，觀眾畫面幾秒內就會跟著變。
觀眾按「服務鈴」固定顯示「服務生忙碌中，請稍等。」。

## 歌單匯入

直接寫進 `songs` 表（例如 Supabase → Table Editor → `songs` → Insert → Import data from CSV）。
CSV 欄位：

| 欄位      | 必填 | 說明                                                                                    |
| --------- | ---- | --------------------------------------------------------------------------------------- |
| `room_id` | ✓    | 活動的 `rooms.id`（匯入票券時建立的那筆）                                               |
| `title`   | ✓    | 歌名                                                                                    |
| `artist`  |      | 歌手，顯示在歌名右下角                                                                  |
| `tags`    |      | 歌單分類，JSON 陣列：`["蘆棠布奈"]`、`["小金碧碧"]`、`["合唱"]`；不填就只出現在全部歌曲 |

其他欄位（`id`、`is_active`、`created_at`…）有預設值，不用填。歌曲依 `id` 順序顯示。

## 資料表

```
rooms 1 ─┬─ * songs 1 ─── * song_votes
         └─ * tickets 1 ── 0..2 song_votes   (UNIQUE(ticket_id, category) → 每類一筆，改選 = UPDATE song_id)
```

| 表                  | 說明                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rooms`             | 點歌活動：`slug`、`name`、`status`、`allow_votes`（關閉後不能再點）                                                                                          |
| `songs`             | 歌單：`room_id`、`title`、`artist`、`source`、`source_ref`、`duration_sec`、`tags`、`is_active`                                                              |
| `tickets`           | 票券：`room_id`、`code`（UNIQUE）、`status`（0 停用 / 1 可用）、`type`（1 一般 / 2 特殊）、`last_login_at`                                                   |
| `song_votes`        | 票券 → 歌曲：`ticket_id`、`song_id`、`category`（1 一般 / 2 合唱，與 `ticket_id` 組成 UNIQUE）、`created_at`（第一次點）、`updated_at`（投給目前這首的時間） |
| `admins`            | 後台管理員：`username`（UNIQUE）、`password_hash`（scrypt）、`last_login_at`                                                                                 |
| `schema_migrations` | Umzug 執行紀錄                                                                                                                                               |

排行榜（[server/store/song.js](server/store/song.js)）：

```sql
SELECT s.*, COALESCE(c.vote_count, 0) AS vote_count
FROM songs s
LEFT JOIN (
    SELECT song_id, COUNT(*) AS vote_count, MIN(updated_at) AS first_voted_at
    FROM song_votes WHERE category = 1 GROUP BY song_id
) c ON c.song_id = s.id
WHERE s.room_id = :roomId AND s.is_active
ORDER BY vote_count DESC, first_voted_at ASC NULLS LAST, s.title
```

排行榜只算一般點歌（`category = 1`），合唱不列入。
同票數時，先拿到票的歌排前面（改選的票以改選時間計）。

誰點了哪首合唱（現場安排上台用）：

```sql
SELECT s.title, t.code, v.updated_at
FROM song_votes v
JOIN songs s ON s.id = v.song_id
JOIN tickets t ON t.id = v.ticket_id
WHERE v.category = 2
ORDER BY s.id, v.updated_at;
```

點歌 / 改選（[server/store/song-vote.js](server/store/song-vote.js)），一條 SQL 完成，同時送出也只會有一筆：

```sql
INSERT INTO song_votes (ticket_id, song_id, category) VALUES (:ticketId, :songId, :category)
ON CONFLICT (ticket_id, category) DO UPDATE SET song_id = EXCLUDED.song_id, updated_at = NOW()
```

`category` 由歌曲決定：tags 含 `合唱` 是合唱（2），其他是一般（1）；一般票點合唱會回 403。
選到跟目前同一首時不寫入（不刷新 updated_at）。

## 登入機制

票券、管理員各用自己的 cookie（`jukebox_ticket` / `jukebox_admin`），token 內容不同，不能互用。

- `POST /auth/login` 驗證票券碼 → 發 HttpOnly cookie（HMAC 簽章，12 小時，`SESSION_SECRET` 簽）
- 之後每個請求都會重新確認票券仍存在且未停用；停用票券會立即失效
- 登入 API 每 IP 每分鐘限 10 次，防止暴力猜碼；管理員登入每 IP 每分鐘 5 次

## API（/api/v1）

| Method | Path                             | 權限 | 說明                                                                        |
| ------ | -------------------------------- | ---- | --------------------------------------------------------------------------- |
| GET    | `/health`                        | -    | 服務 + DB 狀態                                                              |
| POST   | `/auth/login`                    | -    | 票券登入 `{ code }`                                                         |
| GET    | `/auth/me`                       | 票券 | 票券、活動、`canVoteDuet`、自己點的歌 `votes: { general, duet }`            |
| GET    | `/songs?page=&pageSize=&tag=&q=` | 票券 | 歌單分頁（依編號排序，可依分類、關鍵字篩選）                                |
| GET    | `/songs/ranking`                 | 票券 | 排行榜前 20（只列有票的）`items`，加上投票進度 `votedCount` / `ticketCount` |
| PUT    | `/songs/vote`                    | 票券 | 點歌 / 改選 `{ songId }`，回傳 `isDuet`、`previousSongId`、`changed`        |

後台（`/admin` 開頭，除了 login / logout 都需要管理員登入）：

| Method | Path                               | 說明                                                          |
| ------ | ---------------------------------- | ------------------------------------------------------------- |
| POST   | `/admin/login`                     | 管理員登入 `{ username, password }`                           |
| POST   | `/admin/logout`                    | 管理員登出                                                    |
| GET    | `/admin/me`                        | 目前管理員                                                    |
| GET    | `/admin/rooms`                     | 活動列表：`isOpen`、`allowVotes`、`ticketCount`、`votedCount` |
| PUT    | `/admin/rooms/:roomId/allow-votes` | 開放 / 停止點歌 `{ allowVotes: boolean }`                     |
| DELETE | `/admin/rooms/:roomId/votes`       | 重置選歌（清一般點歌），回傳 `deleted` 筆數                   |

## 目錄結構

```
app/                     前端：index（點歌頁，只支援橫向）、admin（後台）
server/
  config/database.js     Sequelize 連線（production → DATABASE_URL，其他 → TEST_DB_URL）
  migration/umzug/       001 rooms / 002 songs / 003 tickets / 004 song_votes / 005 開啟 RLS / 006 票券類型、點歌類別 / 007 admins
  model/                 schema/ 一表一檔，index.js 設關聯
  store/                 DB 存取（排行榜 SQL、票券整批寫入）
  service/               商業邏輯（登入、點歌一次限制、活動開關）
  route-handlers/        解析參數 → service → 回應
  routes/jukebox/        路由，掛在 /api/v1
  middleware/            require-ticket、require-admin、rate-limit
  lib/                   enum、錯誤碼、signed-session（ticket / admin session）、password、ticket-code、script/（seed、匯入票券）
```

## Migration

```powershell
npm run migrate            # 執行待跑的 migration
npm run migrate:status     # 已執行 / 待執行
npm run migrate:down       # 回滾最後一支
```

新增 migration：在 `server/migration/umzug/` 建 `008-xxx.js`，匯出 `up({ context: sequelize })` / `down(...)`。
已上線的 migration 不要改，改 schema 一律新增一支。
