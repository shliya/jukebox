const SongStore = require('../store/song');
const SongVoteStore = require('../store/song-vote');
const RoomStore = require('../store/room');
const TicketStore = require('../store/ticket');
const {
    ENUM_ROOM_STATUS,
    ENUM_TICKET_TYPE,
    ENUM_VOTE_CATEGORY,
    SONG_TAG_DUET,
} = require('../lib/enum');
const {
    AppError,
    ROOM_NOT_FOUND,
    ROOM_CLOSED,
    SONG_NOT_FOUND,
    DUET_NOT_ALLOWED,
} = require('../lib/error/code');

/** tags 含「合唱」的歌算合唱類 */
function isDuetSong(song) {
    return Array.isArray(song.tags) && song.tags.includes(SONG_TAG_DUET);
}

/** 特殊票才能點合唱 */
function canVoteDuet(ticket) {
    return ticket.type === ENUM_TICKET_TYPE.SPECIAL;
}

/**
 * 觀眾：歌單分頁，可依分類（tag）篩選、搜尋
 * 頁碼超出範圍時自動拉回最後一頁
 */
async function getSongList(ticket, { tag, keyword, page = 1, pageSize = 20 }) {
    let current = page;
    let result = await SongStore.getSongPageByRoomId(ticket.roomId, {
        tag,
        keyword,
        page: current,
        pageSize,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / pageSize));
    if (current > totalPages) {
        current = totalPages;
        result = await SongStore.getSongPageByRoomId(ticket.roomId, {
            tag,
            keyword,
            page: current,
            pageSize,
        });
    }
    return {
        items: result.items,
        total: result.total,
        page: current,
        pageSize,
        totalPages,
    };
}

/** 觀眾：排行榜（只列有票的歌）+ 投票進度（已投票 / 總票數） */
async function getRankingByRoomId(roomId, { limit } = {}) {
    const [items, progress] = await Promise.all([
        SongStore.getSongRankingByRoomId(roomId, { onlyVoted: true, limit }),
        TicketStore.getVoteProgressByRoomId(roomId),
    ]);
    return { items, ...progress };
}

/**
 * 觀眾：點歌 / 改選。一般、合唱各算一類，每類一張票只有一筆，改選是更新同一筆
 *   一般票只能點一般歌曲；特殊票一般、合唱各可點一首
 * @returns {{ songId, title, artist, isDuet: boolean, previousSongId: number|null, changed: boolean }}
 */
async function voteSong(ticket, songId) {
    const room = await RoomStore.getRoomById(ticket.roomId);
    if (!room) {
        throw new AppError(ROOM_NOT_FOUND);
    }
    if (room.status !== ENUM_ROOM_STATUS.ACTIVE || !room.allowVotes) {
        throw new AppError(ROOM_CLOSED);
    }
    const song = await SongStore.getActiveSongByIdAndRoomId(songId, room.id);
    if (!song) {
        throw new AppError(SONG_NOT_FOUND);
    }

    const isDuet = isDuetSong(song);
    if (isDuet && !canVoteDuet(ticket)) {
        throw new AppError(DUET_NOT_ALLOWED);
    }
    const category = isDuet
        ? ENUM_VOTE_CATEGORY.DUET
        : ENUM_VOTE_CATEGORY.GENERAL;

    const result = {
        songId: Number(song.id),
        title: song.title,
        artist: song.artist,
        isDuet,
    };
    const existing = await SongVoteStore.getVoteByTicketIdAndCategory(
        ticket.id,
        category
    );
    const previousSongId = existing ? Number(existing.songId) : null;

    // 選同一首不寫入，避免 updated_at 被刷新影響同票排序
    if (previousSongId === result.songId) {
        return { ...result, previousSongId, changed: false };
    }
    await SongVoteStore.upsertVote({
        ticketId: ticket.id,
        songId: song.id,
        category,
    });
    return { ...result, previousSongId, changed: true };
}

module.exports = {
    canVoteDuet,
    getSongList,
    getRankingByRoomId,
    voteSong,
};
