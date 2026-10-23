const SongStore = require('../store/song');
const SongVoteStore = require('../store/song-vote');
const RoomStore = require('../store/room');
const { ENUM_ROOM_STATUS } = require('../lib/enum');
const {
    AppError,
    ROOM_NOT_FOUND,
    ROOM_CLOSED,
    SONG_NOT_FOUND,
} = require('../lib/error/code');

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

/** 觀眾：排行榜（只列有票的歌） */
async function getRankingByRoomId(roomId, { limit } = {}) {
    return SongStore.getSongRankingByRoomId(roomId, {
        onlyVoted: true,
        limit,
    });
}

/**
 * 觀眾：點歌 / 改選。一張票只有一筆，改選是更新同一筆
 * @returns {{ songId, title, artist, previousSongId: number|null, changed: boolean }}
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

    const result = {
        songId: Number(song.id),
        title: song.title,
        artist: song.artist,
    };
    const existing = await SongVoteStore.getVoteByTicketId(ticket.id);
    const previousSongId = existing ? Number(existing.songId) : null;

    // 選同一首不寫入，避免 updated_at 被刷新影響同票排序
    if (previousSongId === result.songId) {
        return { ...result, previousSongId, changed: false };
    }
    await SongVoteStore.upsertVote({ ticketId: ticket.id, songId: song.id });
    return { ...result, previousSongId, changed: true };
}

module.exports = {
    getSongList,
    getRankingByRoomId,
    voteSong,
};
