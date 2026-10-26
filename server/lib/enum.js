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

const ENUM_TICKET_TYPE = {
    NORMAL: 1, // 一般票：只能點一般歌曲
    SPECIAL: 2, // 特殊票：一般、合唱各可點一首
};

const ENUM_VOTE_CATEGORY = {
    GENERAL: 1, // 一般歌曲
    DUET: 2, // 合唱歌曲：只有特殊票能點，點了就是持票人上台跟歌手合唱，不列入排行榜
};

// tags 含這個分類的歌算合唱，要跟伴唱機上方「合唱」按鈕的 data-tag 一致
const SONG_TAG_DUET = '合唱';

module.exports = {
    ENUM_ROOM_STATUS,
    ENUM_SONG_SOURCE,
    ENUM_TICKET_STATUS,
    ENUM_TICKET_TYPE,
    ENUM_VOTE_CATEGORY,
    SONG_TAG_DUET,
};
