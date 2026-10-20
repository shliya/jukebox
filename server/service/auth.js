const TicketStore = require('../store/ticket');
const RoomStore = require('../store/room');
const SongVoteStore = require('../store/song-vote');
const { ENUM_TICKET_STATUS, ENUM_ROOM_STATUS } = require('../lib/enum');
const {
    normalizeTicketCode,
    isValidTicketCode,
} = require('../lib/ticket-code');
const {
    AppError,
    TICKET_INVALID,
    TICKET_DISABLED,
    ROOM_NOT_FOUND,
} = require('../lib/error/code');

/** 票券碼登入，成功回傳 ticket */
async function loginWithTicketCode(rawCode) {
    const code = normalizeTicketCode(rawCode);
    if (!isValidTicketCode(code)) {
        throw new AppError(TICKET_INVALID);
    }
    const ticket = await TicketStore.getTicketByCode(code);
    if (!ticket) {
        throw new AppError(TICKET_INVALID);
    }
    if (ticket.status !== ENUM_TICKET_STATUS.ACTIVE) {
        throw new AppError(TICKET_DISABLED);
    }
    await TicketStore.touchLastLogin(ticket.id);
    return ticket;
}

/** 依 session 的 ticketId 取回仍有效的票券；無效回傳 null */
async function getActiveTicket(ticketId) {
    const ticket = await TicketStore.getTicketById(ticketId);
    if (!ticket || ticket.status !== ENUM_TICKET_STATUS.ACTIVE) {
        return null;
    }
    return ticket;
}

/** 目前登入者資訊：活動、自己點的歌 */
async function getMe(ticket) {
    const [room, vote] = await Promise.all([
        RoomStore.getRoomById(ticket.roomId),
        SongVoteStore.getVoteByTicketId(ticket.id),
    ]);
    if (!room) {
        throw new AppError(ROOM_NOT_FOUND);
    }
    return {
        ticketCode: ticket.code,
        room: {
            slug: room.slug,
            name: room.name,
            description: room.description,
            isOpen: room.status === ENUM_ROOM_STATUS.ACTIVE && room.allowVotes,
        },
        vote: vote
            ? {
                  songId: Number(vote.songId),
                  title: vote.song && vote.song.title,
                  artist: vote.song && vote.song.artist,
                  votedAt: vote.updatedAt,
              }
            : null,
    };
}

module.exports = {
    loginWithTicketCode,
    getActiveTicket,
    getMe,
};
