const SongStore = require('../store/song');
const SongVoteStore = require('../store/song-vote');
const RoomStore = require('../store/room');
const TicketStore = require('../store/ticket');
const { ENUM_ROOM_STATUS, ENUM_SONG_SOURCE } = require('../lib/enum');
const {
    AppError,
    ROOM_NOT_FOUND,
    ROOM_CLOSED,
    SONG_NOT_FOUND,
} = require('../lib/error/code');

async function getRoomBySlugOrThrow(slug) {
    const room = await RoomStore.getRoomBySlug(slug);
    if (!room) {
        throw new AppError(ROOM_NOT_FOUND);
    }
    return room;
}

/** 觀眾：歌單（含票數，依票數排序，可搜尋） */
async function getSongList(ticket, { keyword } = {}) {
    return SongStore.getSongRankingByRoomId(ticket.roomId, { keyword });
}

/** 觀眾 / 管理：排行榜（只列有票的歌） */
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

/** 管理：新增歌曲 */
async function createSong(slug, { title, artist, durationSec, tags }) {
    const room = await getRoomBySlugOrThrow(slug);
    return SongStore.createSong({
        roomId: room.id,
        title,
        artist: artist || null,
        source: ENUM_SONG_SOURCE.MANUAL,
        durationSec: durationSec ?? null,
        tags: tags || [],
    });
}

/** 管理：排行榜 + 票券使用統計 */
async function getAdminOverview(slug) {
    const room = await getRoomBySlugOrThrow(slug);
    const [ranking, ticketStats] = await Promise.all([
        getRankingByRoomId(room.id),
        TicketStore.getTicketStatsByRoomId(room.id),
    ]);
    return {
        room: { slug: room.slug, name: room.name },
        ticketStats,
        ranking,
    };
}

module.exports = {
    getSongList,
    getRankingByRoomId,
    voteSong,
    createSong,
    getAdminOverview,
};
