import './css/common.css';
import './css/admin.css';
import { apiRequest } from './js/api.js';
import { renderRanking } from './js/ranking-view.js';

const TOKEN_KEY = 'jukebox-admin-token';
const REFRESH_MS = 5000;

const slug = encodeURIComponent(
    new URLSearchParams(window.location.search).get('room') || 'demo'
);

const state = {
    adminToken: readToken(),
};

const dom = {
    roomName: document.getElementById('roomName'),
    tokenForm: document.getElementById('tokenForm'),
    tokenInput: document.getElementById('tokenInput'),
    statTotal: document.getElementById('statTotal'),
    statLoggedIn: document.getElementById('statLoggedIn'),
    statVoted: document.getElementById('statVoted'),
    rankingList: document.getElementById('rankingList'),
    overviewMessage: document.getElementById('overviewMessage'),
    songForm: document.getElementById('songForm'),
    songTitle: document.getElementById('songTitle'),
    songArtist: document.getElementById('songArtist'),
    songDuration: document.getElementById('songDuration'),
    songMessage: document.getElementById('songMessage'),
};

function readToken() {
    try {
        return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch {
        return '';
    }
}

function saveToken(token) {
    state.adminToken = token;
    try {
        sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
        // 無痕模式等情況存不了，只保留在記憶體
    }
}

async function loadOverview() {
    if (!state.adminToken) {
        dom.overviewMessage.textContent = '請先輸入 Admin Token';
        return;
    }
    try {
        const { room, ticketStats, ranking } = await apiRequest(
            `/admin/rooms/${slug}`,
            { adminToken: state.adminToken }
        );
        dom.overviewMessage.textContent = '';
        dom.roomName.textContent = `${room.name}｜管理`;
        dom.statTotal.textContent = ticketStats.total;
        dom.statLoggedIn.textContent = ticketStats.loggedIn;
        dom.statVoted.textContent = ticketStats.voted;
        renderRanking(dom.rankingList, ranking);
    } catch (error) {
        dom.overviewMessage.textContent = error.message;
    }
}

dom.tokenInput.value = state.adminToken;
dom.tokenForm.addEventListener('submit', event => {
    event.preventDefault();
    saveToken(dom.tokenInput.value.trim());
    loadOverview();
});

dom.songForm.addEventListener('submit', async event => {
    event.preventDefault();
    try {
        const song = await apiRequest(`/admin/rooms/${slug}/songs`, {
            method: 'POST',
            body: {
                title: dom.songTitle.value,
                artist: dom.songArtist.value,
                durationSec: dom.songDuration.value,
            },
            adminToken: state.adminToken,
        });
        dom.songMessage.textContent = `已新增「${song.title}」`;
        dom.songMessage.classList.remove('is-error');
        dom.songForm.reset();
    } catch (error) {
        dom.songMessage.textContent = error.message;
        dom.songMessage.classList.add('is-error');
    }
});

loadOverview();
setInterval(loadOverview, REFRESH_MS);
