const AuthService = require('../service/auth');
const {
    getSessionTicketId,
    clearSessionCookie,
} = require('../lib/ticket-session');
const { sendError } = require('../lib/send-error');
const { AppError, NOT_LOGGED_IN } = require('../lib/error/code');

/**
 * 需先用票券碼登入；通過後 req.ticket 為目前票券
 */
module.exports = async (req, res, next) => {
    try {
        const ticketId = getSessionTicketId(req);
        const ticket = ticketId
            ? await AuthService.getActiveTicket(ticketId)
            : null;
        if (!ticket) {
            // 票券被停用 / 刪除時順便清掉 cookie
            if (ticketId) clearSessionCookie(res);
            throw new AppError(NOT_LOGGED_IN);
        }
        req.ticket = ticket;
        next();
    } catch (error) {
        sendError(res, error);
    }
};
