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

// 合唱開放所有票券；改回 false 就恢復成只有特殊票能點
const DUET_OPEN_TO_ALL = true;

/**
 * 這張票目前點的歌：正常只有一筆；舊規則（一般、合唱各一筆）留下的資料取最後點的那筆
 * @param {Array<{ updatedAt: Date }>} votes
 */
function latestVote(votes) {
    return votes.reduce(
        (latest, vote) =>
            !latest || vote.updatedAt > latest.updatedAt ? vote : latest,
        null
    );
}

/** 能不能點合唱：目前開放所有票券 */
function canVoteDuet(ticket) {
    return DUET_OPEN_TO_ALL || ticket.type === ENUM_TICKET_TYPE.SPECIAL;
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
 * 觀眾：點歌 / 改選。一張票只能點一首（一般或合唱擇一），改選是更新同一筆
 *   一律寫成 category=一般，靠 UNIQUE(ticket_id, category) 保證一張票只有一筆；
 *   是不是合唱由歌曲的 tags 決定（isDuet 只用來回傳）
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
    const category = ENUM_VOTE_CATEGORY.GENERAL;

    const result = {
        songId: Number(song.id),
        title: song.title,
        artist: song.artist,
        isDuet,
    };
    const existing = latestVote(
        await SongVoteStore.getVotesByTicketId(ticket.id)
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
    // 舊規則留下的合唱類點歌（category=2）一併清掉，一張票只留這一首
    await SongVoteStore.deleteVotesByTicketIdExceptCategory(
        ticket.id,
        category
    );
    return { ...result, previousSongId, changed: true };
}

module.exports = {
    canVoteDuet,
    latestVote,
    getSongList,
    getRankingByRoomId,
    voteSong,
};
