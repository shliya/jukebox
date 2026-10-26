import './css/index.css';
import { apiRequest, songLabel, el } from './js/api.js';
import { renderRanking } from './js/ranking-view.js';

const TOAST_MS = 2500;
// 每隔幾秒同步一次活動狀態與自己點的歌（後台停止點歌、重置選歌後畫面跟著更新）
const SYNC_MS = 5000;
// tags 含這個分類的歌算合唱，只有特殊票能點（跟後端 SONG_TAG_DUET 一致）
const DUET_TAG = '合唱';

// 每欄幾首依螢幕高度決定：大螢幕照設計稿 10 首；手機橫放約 6～7 首，列高才不會小於 36px
const MAX_ROWS = 10;
const MIN_ROWS = 4;
const MIN_ROW_PX = 36;
const ROW_GAP_PX = 3;

const state = {
    me: null, // { ticketCode, canVoteDuet, room, votes: { general, duet } }
    tag: '', // '' = 全部歌曲
    page: 1,
    totalPages: 1,
    rows: MAX_ROWS, // 每欄列數，一頁 = rows × 2 欄
    items: [],
    busy: false,
    requestId: 0,
    // 每次登入 / 登出 +1；請求回來時 session 已變，代表中間登出過，結果直接丟掉
    session: 0,
    // 每次點歌成功 +1；同步請求回來時已變，代表中間點過歌，舊資料直接丟掉
    voteVersion: 0,
};

const pageSize = () => state.rows * 2;

const $ = id => document.getElementById(id);
const dom = {
    loginView: $('loginView'),
    loginForm: $('loginForm'),
    ticketCode: $('ticketCode'),
    loginBtn: $('loginBtn'),
    loginMessage: $('loginMessage'),

    mainView: $('mainView'),
    homeBtn: $('homeBtn'),
    tabs: [...document.querySelectorAll('.ktv-tab')],
    roomNotice: $('roomNotice'),
    closedOverlay: $('closedOverlay'),
    listHeading: $('listHeading'),
    songList: $('songList'),
    cutBtn: $('cutBtn'),
    queueBtn: $('queueBtn'),
    bellBtn: $('bellBtn'),
    pageLabel: $('pageLabel'),
    prevBtn: $('prevBtn'),
    nextBtn: $('nextBtn'),

    queueDialog: $('queueDialog'),
    closeDialogBtn: $('closeDialogBtn'),
    myVote: $('myVote'),
    voteHint: $('voteHint'),
    rankingList: $('rankingList'),
    voteProgress: $('voteProgress'),
    ticketLabel: $('ticketLabel'),

    toast: $('toast'),
};

const pad2 = n => String(n).padStart(2, '0');

/* ---------- 提示訊息 ---------- */

let toastTimer = null;
function toast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(
        () => dom.toast.classList.remove('is-visible'),
        TOAST_MS
    );
}

/** API 回 401 → 登入過期 / 票券停用，回登入頁；其他錯誤用提示訊息 */
function handleApiError(error) {
    if (error.status === 401) {
        showLogin(error.message);
        return;
    }
    toast(error.message);
}

/* ---------- 登入 / 登出 ---------- */

function showLogin(message = '') {
    // 先作廢這次登入的所有進行中請求，再清狀態；下一個人登入時從全部歌曲第 1 頁開始
    state.session++;
    state.requestId++;
    state.me = null;
    state.items = [];
    state.tag = '';
    state.page = 1;
    state.totalPages = 1;
    state.busy = false;
    dom.songList.replaceChildren();
    dom.myVote.textContent = '';
    dom.rankingList.replaceChildren();
    dom.voteProgress.textContent = '';
    dom.ticketLabel.textContent = '';
    clearTimeout(toastTimer);
    dom.toast.classList.remove('is-visible');
    if (dom.queueDialog.open) dom.queueDialog.close();
    stopSync();
    dom.mainView.hidden = true;
    dom.loginView.hidden = false;
    dom.loginMessage.textContent = message;
    dom.ticketCode.focus();
}

function showMain(me) {
    state.session++;
    state.me = me;
    dom.loginView.hidden = true;
    dom.mainView.hidden = false;
    applyRoomOpen(me.room.isOpen);
    dom.ticketLabel.textContent = me.canVoteDuet
        ? `票券 ${me.ticketCode}（可點合唱）`
        : `票券 ${me.ticketCode}`;
    dom.voteHint.textContent = me.canVoteDuet
        ? '一般、合唱各點一首，合唱曲由你上台跟歌手一起唱；想換歌直接在歌單按「點歌」'
        : '一張票只算一首，想換歌直接在歌單按「點歌」';
    applyRows(measureRows());
    loadSongs();
    startSync();
}

/* ---------- 停止點歌：擋板蓋住歌單 ---------- */

function applyRoomOpen(isOpen) {
    dom.roomNotice.hidden = isOpen;
    dom.closedOverlay.hidden = isOpen;
}

/* ---------- 定時同步：活動開關、自己點的歌 ---------- */

let syncTimer = null;

function startSync() {
    stopSync();
    syncTimer = setInterval(syncMe, SYNC_MS);
}

function stopSync() {
    clearInterval(syncTimer);
    syncTimer = null;
}

async function syncMe() {
    // 切到背景時不打，回到前景下一輪就會更新
    if (!state.me || document.hidden) return;
    const session = state.session;
    const voteVersion = state.voteVersion;
    try {
        const me = await apiRequest('/auth/me');
        if (session !== state.session || voteVersion !== state.voteVersion) {
            return;
        }
        const before = `${state.me.room.isOpen}|${votedSongIds()}`;
        state.me = me;
        applyRoomOpen(me.room.isOpen);
        if (before !== `${me.room.isOpen}|${votedSongIds()}`) renderSongs();
    } catch (error) {
        // 票券停用 / 過期才回登入頁；網路暫時失敗等下一輪
        if (session === state.session && error.status === 401) {
            handleApiError(error);
        }
    }
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncMe();
});

/* ---------- 依螢幕高度決定每欄幾首 ---------- */

const isLandscape = () => window.innerWidth >= window.innerHeight;

/** 歌單區塊放得下幾列（每列至少 MIN_ROW_PX） */
function measureRows() {
    const height = dom.songList.parentElement.clientHeight;
    const fit = Math.floor((height + ROW_GAP_PX) / (MIN_ROW_PX + ROW_GAP_PX));
    return Math.min(MAX_ROWS, Math.max(MIN_ROWS, fit));
}

function applyRows(rows) {
    state.rows = rows;
    dom.songList.style.setProperty('--rows', String(rows));
}

/** 轉向 / 縮放視窗後列數變了：維持目前第一首在畫面上，重新抓這一頁 */
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (dom.mainView.hidden || !isLandscape()) return;
        const rows = measureRows();
        if (rows === state.rows) return;
        const firstIndex = (state.page - 1) * pageSize();
        applyRows(rows);
        state.page = Math.floor(firstIndex / pageSize()) + 1;
        loadSongs();
    }, 150);
});

dom.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dom.ticketCode.value.trim()) {
        dom.loginMessage.textContent = '請輸入票券碼';
        dom.ticketCode.focus();
        return;
    }
    dom.loginBtn.disabled = true;
    dom.loginBtn.textContent = '登入中…';
    try {
        const me = await apiRequest('/auth/login', {
            method: 'POST',
            body: { code: dom.ticketCode.value },
        });
        dom.ticketCode.value = '';
        dom.loginMessage.textContent = '';
        showMain(me);
    } catch (error) {
        dom.loginMessage.textContent = error.message;
        dom.ticketCode.select();
    } finally {
        dom.loginBtn.disabled = false;
        dom.loginBtn.textContent = '開始點歌';
    }
});

/* ---------- 歌單 ---------- */

const isDuetSong = song => (song.tags || []).includes(DUET_TAG);

/** 自己點的歌（一般、合唱） */
const votedSongIds = () => {
    if (!state.me) return [];
    const { general, duet } = state.me.votes;
    return [general, duet].filter(Boolean).map(vote => vote.songId);
};

function songRow(song, index) {
    const number = (state.page - 1) * pageSize() + index + 1;
    const isMine = votedSongIds().includes(song.id);
    const classes = ['song-row'];
    if (index % 2 === 1) classes.push('is-yellow');
    if (isMine) classes.push('is-mine');

    const voteBtn = el('button', {
        className: 'green-btn',
        text: isMine ? '已點' : '點歌',
        attrs: {
            type: 'button',
            'aria-pressed': String(isMine),
            'aria-label': `${isMine ? '已點' : '點歌'}：${songLabel(song)}`,
        },
    });
    voteBtn.disabled = !state.me.room.isOpen;
    voteBtn.addEventListener('click', () => voteSong(song));

    const cutInBtn = el('button', {
        className: 'green-btn',
        text: '插播',
        attrs: { type: 'button', 'aria-label': `插播：${songLabel(song)}` },
    });
    cutInBtn.addEventListener('click', () => toast('「插播」功能尚未開放'));

    return el('li', { className: classes.join(' ') }, [
        el('span', { className: 'song-no', text: String(number) }),
        el('div', { className: 'song-info' }, [
            el('span', { className: 'song-title', text: song.title }),
            el('span', { className: 'song-artist', text: song.artist || '' }),
        ]),
        el('div', { className: 'song-buttons' }, [voteBtn, cutInBtn]),
    ]);
}

/** 最後一頁不滿時補空白列，維持設計稿的 2 欄滿版 */
function emptyRow(index) {
    return el(
        'li',
        {
            className: `song-row is-empty${index % 2 === 1 ? ' is-yellow' : ''}`,
            attrs: { 'aria-hidden': 'true' },
        },
        [el('span', { className: 'song-no' })]
    );
}

function renderSongs() {
    // 已登出（例如登出時關閉「已點歌曲」視窗觸發）就不畫
    if (!state.me) return;
    const rows = state.items.map(songRow);
    if (rows.length === 0) {
        dom.songList.replaceChildren(
            el('li', { className: 'list-empty', text: '這個歌單還沒有歌' })
        );
    } else {
        for (let i = rows.length; i < pageSize(); i++) rows.push(emptyRow(i));
        dom.songList.replaceChildren(...rows);
    }

    dom.pageLabel.textContent = `第${pad2(state.page)}/${pad2(state.totalPages)}頁`;
    dom.prevBtn.disabled = state.page <= 1;
    dom.nextBtn.disabled = state.page >= state.totalPages;

    const activeTab = dom.tabs.find(tab => tab.dataset.tag === state.tag);
    dom.tabs.forEach(tab =>
        tab.setAttribute('aria-pressed', String(tab === activeTab))
    );
    dom.listHeading.textContent = activeTab
        ? activeTab.textContent.trim()
        : '全部歌曲';
}

async function loadSongs() {
    // 連續觸發（例如轉向時）只採用最後一次的結果
    const requestId = ++state.requestId;
    state.busy = true;
    dom.songList.setAttribute('aria-busy', 'true');
    try {
        const params = new URLSearchParams({
            page: state.page,
            pageSize: pageSize(),
        });
        if (state.tag) params.set('tag', state.tag);
        const result = await apiRequest(`/songs?${params}`);
        if (requestId !== state.requestId) return;
        state.items = result.items;
        state.page = result.page;
        state.totalPages = result.totalPages;
        renderSongs();
    } catch (error) {
        if (requestId === state.requestId) handleApiError(error);
    } finally {
        if (requestId === state.requestId) {
            state.busy = false;
            dom.songList.setAttribute('aria-busy', 'false');
        }
    }
}

function changeList({ tag = state.tag, page = 1 }) {
    if (state.busy) return;
    state.tag = tag;
    state.page = page;
    loadSongs();
}

dom.tabs.forEach(tab =>
    tab.addEventListener('click', () => {
        // 再按一次目前的歌單 → 回到全部歌曲
        const tag = state.tag === tab.dataset.tag ? '' : tab.dataset.tag;
        changeList({ tag });
    })
);
dom.homeBtn.addEventListener('click', () => changeList({ tag: '' }));
dom.prevBtn.addEventListener('click', () =>
    changeList({ page: state.page - 1 })
);
dom.nextBtn.addEventListener('click', () =>
    changeList({ page: state.page + 1 })
);

/* ---------- 點歌（一張票一首，可改選） ---------- */

async function voteSong(song) {
    if (votedSongIds().includes(song.id)) {
        toast(`已經點了「${song.title}」`);
        return;
    }
    // 一般票看得到合唱歌單但不能點；後端也會擋
    if (isDuetSong(song) && !state.me.canVoteDuet) {
        toast('此票券不能點合唱歌曲');
        return;
    }
    const session = state.session;
    try {
        const vote = await apiRequest('/songs/vote', {
            method: 'PUT',
            body: { songId: song.id },
        });
        if (session !== state.session) return;
        state.voteVersion++;
        state.me.votes[vote.isDuet ? 'duet' : 'general'] = vote;
        renderSongs();
        if (vote.isDuet) {
            toast(
                vote.previousSongId
                    ? `合唱曲已改成「${vote.title}」`
                    : `已點合唱「${vote.title}」，到時候上台跟歌手一起唱！`
            );
        } else {
            toast(
                vote.previousSongId
                    ? `已改點「${vote.title}」`
                    : `已點「${vote.title}」，之後還可以改選`
            );
        }
    } catch (error) {
        if (session === state.session) handleApiError(error);
    }
}

/* ---------- 已點歌曲 ---------- */

function myVoteText({ canVoteDuet, votes }) {
    const label = vote => (vote ? songLabel(vote) : '還沒有點歌');
    if (!canVoteDuet) return label(votes.general);
    return `一般：${label(votes.general)}
上台合唱：${label(votes.duet)}`;
}

async function openQueue() {
    const session = state.session;
    try {
        const [me, ranking] = await Promise.all([
            apiRequest('/auth/me'),
            apiRequest('/songs/ranking'),
        ]);
        if (session !== state.session) return;
        state.me = me;
        applyRoomOpen(me.room.isOpen);
        dom.myVote.textContent = myVoteText(me);
        renderRanking(dom.rankingList, ranking.items, votedSongIds());
        dom.voteProgress.textContent = `已投票 ${ranking.votedCount}/${ranking.ticketCount}`;
        dom.queueDialog.showModal();
    } catch (error) {
        if (session === state.session) handleApiError(error);
    }
}

dom.queueBtn.addEventListener('click', openQueue);
dom.closeDialogBtn.addEventListener('click', () => dom.queueDialog.close());
// 點背景關閉
dom.queueDialog.addEventListener('click', event => {
    if (event.target === dom.queueDialog) dom.queueDialog.close();
});
dom.queueDialog.addEventListener('close', () => {
    // 按「登出」關掉視窗時已經回到登入頁，不用重畫歌單、焦點留在票券輸入框
    if (!state.me) return;
    renderSongs();
    dom.queueBtn.focus();
});

/* ---------- 切歌（尚未開放）、服務鈴 ---------- */

dom.cutBtn.addEventListener('click', () => toast('「切歌」功能尚未開放'));
dom.bellBtn.addEventListener('click', () => toast('服務生忙碌中，請稍等。'));

/* ---------- 啟動：已登入就直接進伴唱機 ---------- */

apiRequest('/auth/me')
    .then(showMain)
    .catch(() => showLogin());
