/**
 * 本機測試資料：活動 demo + 示範歌單 + 5 張一般測試票（DEMO-0001 ~ DEMO-0005）
 *   + 1 張特殊測試票 DEMO-DUET（一般、合唱各可點一首）
 * 重複執行不會重複建立；同名歌曲會更新歌手與分類
 *   npm run seed
 */
require('dotenv').config();

// 測試票 DEMO-0001 是公開的碼，寫進正式資料庫等於任何人都能登入
if (process.env.NODE_ENV === 'production') {
    console.error('[seed] NODE_ENV=production，示範資料只能用在本機，已停止');
    process.exit(1);
}

const sequelize = require('../../config/database');
const { Room, Song } = require('../../model');
const TicketStore = require('../../store/ticket');
const { ENUM_TICKET_TYPE } = require('../enum');

const DEMO_SLUG = 'demo';

// 分類（tags）對應伴唱機上方的三個歌單按鈕
const LU = '蘆棠布奈';
const JIN = '小金碧碧';
const DUET = '合唱';
const DUET_ARTIST = `${LU} × ${JIN}`;

const DEMO_SONGS = [
    { title: '有點甜', artist: LU, tags: [LU] },
    { title: '晴天', artist: JIN, tags: [JIN] },
    { title: '小幸運', artist: LU, tags: [LU] },
    { title: '倔強', artist: JIN, tags: [JIN] },
    { title: '夜に駆ける', artist: LU, tags: [LU] },
    { title: '告白氣球', artist: JIN, tags: [JIN] },
    { title: '稻香', artist: LU, tags: [LU] },
    { title: '說好的幸福呢', artist: JIN, tags: [JIN] },
    { title: '突然好想你', artist: LU, tags: [LU] },
    { title: '那些年', artist: JIN, tags: [JIN] },
    { title: '修煉愛情', artist: LU, tags: [LU] },
    { title: '演員', artist: JIN, tags: [JIN] },
    { title: '光年之外', artist: LU, tags: [LU] },
    { title: '漂向北方', artist: JIN, tags: [JIN] },
    { title: '後來', artist: LU, tags: [LU] },
    { title: '天黑黑', artist: JIN, tags: [JIN] },
    { title: '戀愛ing', artist: LU, tags: [LU] },
    { title: '我們的歌', artist: JIN, tags: [JIN] },
    { title: '青花瓷', artist: LU, tags: [LU] },
    { title: '愛你', artist: JIN, tags: [JIN] },
    { title: '小酒窩', artist: DUET_ARTIST, tags: [DUET] },
    { title: '屋頂', artist: DUET_ARTIST, tags: [DUET] },
    { title: '今天你要嫁給我', artist: DUET_ARTIST, tags: [DUET] },
    { title: '你是我的眼', artist: DUET_ARTIST, tags: [DUET] },
    { title: '因為愛情', artist: DUET_ARTIST, tags: [DUET] },
    { title: '廣島之戀', artist: DUET_ARTIST, tags: [DUET] },
];
const DEMO_TICKETS = [
    'DEMO-0001',
    'DEMO-0002',
    'DEMO-0003',
    'DEMO-0004',
    'DEMO-0005',
];
const DEMO_SPECIAL_TICKETS = ['DEMO-DUET'];

async function main() {
    try {
        const [room] = await Room.findOrCreate({
            where: { slug: DEMO_SLUG },
            defaults: { name: '示範點歌活動', description: '本機測試用' },
        });

        let created = 0;
        let updated = 0;
        for (const song of DEMO_SONGS) {
            const existing = await Song.findOne({
                where: { roomId: room.id, title: song.title },
            });
            if (existing) {
                await existing.update({ artist: song.artist, tags: song.tags });
                updated++;
            } else {
                await Song.create({ ...song, roomId: room.id });
                created++;
            }
        }
        console.log(
            `[seed] 活動 ${DEMO_SLUG}：新增 ${created} 首、更新 ${updated} 首歌`
        );

        const inserted = await TicketStore.bulkInsertTicketCodes(
            room.id,
            DEMO_TICKETS
        );
        console.log(
            `[seed] 測試票券：${DEMO_TICKETS.join(', ')}（新增 ${inserted.length} 張）`
        );

        const insertedSpecial = await TicketStore.bulkInsertTicketCodes(
            room.id,
            DEMO_SPECIAL_TICKETS,
            { type: ENUM_TICKET_TYPE.SPECIAL }
        );
        console.log(
            `[seed] 特殊測試票：${DEMO_SPECIAL_TICKETS.join(', ')}（新增 ${insertedSpecial.length} 張）`
        );
    } catch (error) {
        console.error('[seed] 失敗（是否已先執行 npm run migrate？）:', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
