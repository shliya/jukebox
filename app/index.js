import './css/common.css';
import './css/index.css';
import { apiRequest, formatDuration, songLabel, el } from './js/api.js';
import { renderRanking } from './js/ranking-view.js';

const RANKING_REFRESH_MS = 10000;

const state = {
    me: null, // { ticketCode, room, vote }
    songs: [],
    selectedSongId: null,
    rankingTimer: null,
};

const dom = {
    loginView: document.getElementById('loginView'),
    loginForm: document.getElementById('loginForm'),
    ticketCode: document.getElementById('ticketCode'),
    loginBtn: document.getElementById('loginBtn'),
    loginMessage: document.getElementById('loginMessage'),

    mainView: document.getElementById('mainView'),
    roomName: document.getElementById('roomName'),
    roomStatus: document.getElementById('roomStatus'),
    ticketLabel: document.getElementById('ticketLabel'),
    logoutBtn: document.getElementById('logoutBtn'),
    voteTitle: document.getElementById('voteTitle'),
    votedSection: document.getElementById('votedSection'),
    votedSong: document.getElementById('votedSong'),
    searchInput: document.getElementById('searchInput'),
    songList: document.getElementById('songList'),
    selectedSong: document.getElementById('selectedSong'),
    voteBtn: document.getElementById('voteBtn'),
    voteMessage: document.getElementById('voteMessage'),
    rankingList: document.getElementById('rankingList'),
};

function setMessage(node, text, isError = false) {
    node.textContent = text;
    node.classList.toggle('is-error', isError);
}

/* ---------- 登入 ---------- */

function showLogin(message = '') {
    clearInterval(state.rankingTimer);
    state.me = null;
    dom.mainView.hidden = true;
    dom.loginView.hidden = false;
    setMessage(dom.loginMessage, message, Boolean(message));
    dom.ticketCode.focus();
}

function showMain(me) {
    state.me = me;
    dom.loginView.hidden = true;
    dom.mainView.hidden = false;
    document.title = `${me.room.name}｜點歌機`;
    dom.roomName.textContent = me.room.name;
    dom.roomStatus.textContent = me.room.isOpen ? '開放點歌中' : '暫停點歌';
    dom.roomStatus.classList.toggle('is-closed', !me.room.isOpen);
    dom.ticketLabel.textContent = `票券 ${me.ticketCode}`;
    renderVoteState();
    loadSongs();
    loadRanking();
    clearInterval(state.rankingTimer);
    state.rankingTimer = setInterval(loadRanking, RANKING_REFRESH_MS);
}

/** 已點過 → 上方顯示目前的歌，按鈕變「改選」；選到同一首時不能送 */
function renderVoteState() {
    const { vote, room } = state.me;
    dom.votedSection.hidden = !vote;
    if (vote) {
        dom.votedSong.textContent = songLabel(vote);
    }
    dom.voteTitle.textContent = vote ? '改選其他歌' : '選一首歌';
    dom.voteBtn.textContent = vote ? '改選這首' : '點這首';
    const isCurrent = Boolean(vote) && vote.songId === state.selectedSongId;
    dom.voteBtn.disabled = !room.isOpen || !state.selectedSongId || isCurrent;
}

/** API 回 401 → 登入過期 / 票券停用，回登入頁 */
function handleApiError(error, messageNode) {
    if (error.status === 401) {
        showLogin(error.message);
        return;
    }
    if (messageNode) setMessage(messageNode, error.message, true);
}

dom.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    dom.loginBtn.disabled = true;
    try {
        const me = await apiRequest('/auth/login', {
            method: 'POST',
            body: { code: dom.ticketCode.value },
        });
        dom.ticketCode.value = '';
        setMessage(dom.loginMessage, '');
        showMain(me);
    } catch (error) {
        setMessage(dom.loginMessage, error.message, true);
    } finally {
        dom.loginBtn.disabled = false;
    }
});

dom.logoutBtn.addEventListener('click', async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => {});
    showLogin();
});

/* ---------- 歌單 / 點歌 ---------- */

function renderSongs() {
    dom.songList.replaceChildren();
    if (state.songs.length === 0) {
        dom.songList.appendChild(
            el('li', { className: 'empty', text: '找不到歌曲' })
        );
        return;
    }
    const votedSongId = state.me.vote ? state.me.vote.songId : null;
    state.songs.forEach(song => {
        const classes = ['song-item'];
        if (song.id === state.selectedSongId) classes.push('is-selected');
        if (song.id === votedSongId) classes.push('is-voted');
        const btn = el(
            'button',
            {
                className: classes.join(' '),
                attrs: { type: 'button' },
            },
            [
                el('span', {
                    className: 'song-title',
                    text:
                        song.id === votedSongId
                            ? `${song.title}（目前選擇）`
                            : song.title,
                }),
                el('span', {
                    className: 'song-meta',
                    text: [song.artist, formatDuration(song.durationSec)]
                        .filter(Boolean)
                        .join(' · '),
                }),
                el('span', {
                    className: 'song-votes',
                    text: `${song.voteCount} 票`,
                }),
            ]
        );
        btn.addEventListener('click', () => {
            state.selectedSongId = song.id;
            dom.selectedSong.textContent = songLabel(song);
            renderSongs();
            renderVoteState();
        });
        dom.songList.appendChild(el('li', {}, [btn]));
    });
}

async function loadSongs(keyword = '') {
    try {
        const q = keyword ? `?q=${encodeURIComponent(keyword)}` : '';
        state.songs = await apiRequest(`/songs${q}`);
        renderSongs();
    } catch (error) {
        handleApiError(error);
    }
}

async function loadRanking() {
    try {
        const ranking = await apiRequest('/songs/ranking');
        renderRanking(
            dom.rankingList,
            ranking,
            state.me && state.me.vote ? state.me.vote.songId : null
        );
    } catch (error) {
        handleApiError(error);
    }
}

let searchTimer = null;
dom.searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(
        () => loadSongs(dom.searchInput.value.trim()),
        300
    );
});

dom.voteBtn.addEventListener('click', async () => {
    const song = state.songs.find(s => s.id === state.selectedSongId);
    if (!song) return;
    const { vote: current } = state.me;
    const question = current
        ? `要把「${songLabel(current)}」改成「${songLabel(song)}」嗎？`
        : `確定要點「${songLabel(song)}」嗎？之後還可以改選。`;
    if (!confirm(question)) {
        return;
    }
    dom.voteBtn.disabled = true;
    try {
        const vote = await apiRequest('/songs/vote', {
            method: 'PUT',
            body: { songId: song.id },
        });
        state.me.vote = vote;
        setMessage(
            dom.voteMessage,
            vote.previousSongId ? '已改選' : '點歌成功'
        );
        renderVoteState();
        // 票數有變，歌單和排行榜都重抓
        loadSongs(dom.searchInput.value.trim());
        loadRanking();
    } catch (error) {
        handleApiError(error, dom.voteMessage);
        renderVoteState();
    }
});

/* ---------- 啟動：已登入就直接進主畫面 ---------- */

apiRequest('/auth/me')
    .then(showMain)
    .catch(() => showLogin());
