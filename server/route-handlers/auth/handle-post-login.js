const AuthService = require('../../service/auth');
const { setSessionCookie } = require('../../lib/ticket-session');
const { sendError } = require('../../lib/send-error');

module.exports = async (req, res) => {
    try {
        const ticket = await AuthService.loginWithTicketCode(
            req.body && req.body.code
        );
        setSessionCookie(res, ticket.id);
        res.json({ status: 'ok', data: await AuthService.getMe(ticket) });
    } catch (error) {
        sendError(res, error);
    }
};
