const AdminStore = require('../store/admin');
const RoomStore = require('../store/room');
const SongStore = require('../store/song');
const TicketStore = require('../store/ticket');
const SongVoteStore = require('../store/song-vote');
const { verifyPassword } = require('../lib/password');
const { ENUM_ROOM_STATUS } = require('../lib/enum');
const {
    AppError,
    ADMIN_LOGIN_FAILED,
    ROOM_NOT_FOUND,
} = require('../lib/error/code');

// 帳號不存在時也跑一次 scrypt，回應時間才不會洩漏帳號是否存在
const DUMMY_HASH = 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64);

/** 管理員登入，成功回傳 admin */
async function loginAdmin(rawUsername, rawPassword) {
    const username = String(rawUsername || '').trim();
    const password = String(rawPassword || '');
    if (!username || !password) {
        throw new AppError(ADMIN_LOGIN_FAILED);
    }
    const admin = await AdminStore.getAdminByUsername(username);
    const ok = await verifyPassword(
        password,
        admin ? admin.passwordHash : DUMMY_HASH
    );
    if (!admin || !ok) {
        throw new AppError(ADMIN_LOGIN_FAILED);
    }
    await AdminStore.touchLastLogin(admin.id);
    return admin;
}

/** 依 session 的 adminId 取回管理員；不存在回傳 null */
async function getAdmin(adminId) {
    return AdminStore.getAdminById(adminId);
}

async function getRoomOrThrow(roomId) {
    const room = await RoomStore.getRoomById(roomId);
    if (!room) {
        throw new AppError(ROOM_NOT_FOUND);
    }
    return room;
}

/** 後台首頁：每個活動的點歌開關、投票進度、目前最高票的歌（跟觀眾排行榜第 1 名一致） */
async function getRoomList() {
    const rooms = await RoomStore.getAllRooms();
    return Promise.all(
        rooms.map(async room => {
            const [progress, [topSong = null]] = await Promise.all([
                TicketStore.getVoteProgressByRoomId(room.id),
                SongStore.getSongRankingByRoomId(room.id, {
                    onlyVoted: true,
                    limit: 1,
                }),
            ]);
            return {
                id: Number(room.id),
                slug: room.slug,
                name: room.name,
                isOpen:
                    room.status === ENUM_ROOM_STATUS.ACTIVE && room.allowVotes,
                allowVotes: room.allowVotes,
                ...progress,
                topSong,
            };
        })
    );
}

/** 開放 / 停止點歌 */
async function setAllowVotes(roomId, allowVotes) {
    const room = await getRoomOrThrow(roomId);
    await RoomStore.updateAllowVotes(room.id, allowVotes);
}

/**
 * 重置選歌：一般、合唱點歌都清空（排行榜、投票進度歸零）
 * @returns {Promise<number>} 清掉的筆數
 */
async function resetVotes(roomId) {
    const room = await getRoomOrThrow(roomId);
    return SongVoteStore.deleteVotesByRoomId(room.id);
}

module.exports = {
    loginAdmin,
    getAdmin,
    getRoomList,
    setAllowVotes,
    resetVotes,
};
