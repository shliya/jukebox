/**
 * 業務錯誤：service 丟出 AppError，handler 依 status / code 回應前端
 */
class AppError extends Error {
    constructor({ code, message, status = 400 }) {
        super(message);
        this.code = code;
        this.status = status;
    }
}

const ROOM_NOT_FOUND = { code: '1001', message: '找不到點歌活動', status: 404 };
const ROOM_CLOSED = { code: '1002', message: '目前未開放點歌', status: 403 };
const SONG_NOT_FOUND = { code: '2001', message: '找不到歌曲', status: 404 };
const TICKET_INVALID = { code: '3001', message: '票券碼錯誤', status: 401 };
const TICKET_DISABLED = { code: '3002', message: '此票券已停用', status: 403 };
const NOT_LOGGED_IN = {
    code: '3003',
    message: '請先輸入票券碼登入',
    status: 401,
};
const INVALID_PARAMS = { code: '9001', message: '參數錯誤', status: 400 };

module.exports = {
    AppError,
    ROOM_NOT_FOUND,
    ROOM_CLOSED,
    SONG_NOT_FOUND,
    TICKET_INVALID,
    TICKET_DISABLED,
    NOT_LOGGED_IN,
    INVALID_PARAMS,
};
