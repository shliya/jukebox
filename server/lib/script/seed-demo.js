/**
 * 本機測試資料：活動 demo + 幾首歌 + 5 張測試票（DEMO-0001 ~ DEMO-0005）
 * 重複執行不會重複建立
 *   npm run seed
 */
require('dotenv').config();

const sequelize = require('../../config/database');
const { Room, Song } = require('../../model');
const TicketStore = require('../../store/ticket');

const DEMO_SLUG = 'demo';
const DEMO_SONGS = [
    { title: '晴天', artist: '周杰倫', durationSec: 269 },
    { title: '小幸運', artist: '田馥甄', durationSec: 265 },
    { title: '倔強', artist: '五月天', durationSec: 260 },
    { title: '夜に駆ける', artist: 'YOASOBI', durationSec: 261 },
];
const DEMO_TICKETS = [
    'DEMO-0001',
    'DEMO-0002',
    'DEMO-0003',
    'DEMO-0004',
    'DEMO-0005',
];

async function main() {
    try {
        const [room, created] = await Room.findOrCreate({
            where: { slug: DEMO_SLUG },
            defaults: { name: '示範點歌活動', description: '本機測試用' },
        });
        if (created) {
            await Song.bulkCreate(
                DEMO_SONGS.map(song => ({ ...song, roomId: room.id }))
            );
            console.log(
                `[seed] 已建立活動 ${DEMO_SLUG} 與 ${DEMO_SONGS.length} 首歌`
            );
        } else {
            console.log(`[seed] 活動 ${DEMO_SLUG} 已存在，略過歌曲`);
        }
        const inserted = await TicketStore.bulkInsertTicketCodes(
            room.id,
            DEMO_TICKETS
        );
        console.log(
            `[seed] 測試票券：${DEMO_TICKETS.join(', ')}（新增 ${inserted.length} 張）`
        );
    } catch (error) {
        console.error('[seed] 失敗（是否已先執行 npm run migrate？）:', error);
        process.exitCode = 1;
    } finally {
        await sequelize.close();
    }
}

main();
