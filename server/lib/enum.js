const ENUM_ROOM_STATUS = {
    CLOSED: 0, // 關閉
    ACTIVE: 1, // 開放中
};

const ENUM_SONG_SOURCE = {
    MANUAL: 1, // 手動建立
    YOUTUBE: 2, // YouTube（之後串接用）
};

const ENUM_TICKET_STATUS = {
    DISABLED: 0, // 停用（不能登入）
    ACTIVE: 1, // 可使用
};

module.exports = {
    ENUM_ROOM_STATUS,
    ENUM_SONG_SOURCE,
    ENUM_TICKET_STATUS,
};
