import './css/admin.css';
import { apiRequest, el } from './js/api.js';

const TOAST_MS = 2500;
// 投票進度自動更新間隔
const REFRESH_MS = 5000;

const $ = id => document.getElementById(id);
const dom = {
    loginView: $('loginView'),
    loginForm: $('loginForm'),
    username: $('username'),
    password: $('password'),
    loginBtn: $('loginBtn'),
    loginMessage: $('loginMessage'),

    mainView: $('mainView'),
    adminName: $('adminName'),
    logoutBtn: $('logoutBtn'),
    roomList: $('roomList'),

    confirmDialog: $('confirmDialog'),
    confirmText: $('confirmText'),

    toast: $('toast'),
};

const state = {
    rooms: [],
    // 有操作進行中的活動 id：按鈕先鎖住，自動更新也先不重畫
    pending: new Set(),
};

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

/** 401 → 登入過期，回登入頁；其他錯誤用提示訊息 */
function handleApiError(error) {
    if (error.status === 401) {
        showLogin(error.message);
        return;
    }
    toast(error.message);
}

/* ---------- 登入 / 登出 ---------- */

let refreshTimer = null;

function showLogin(message = '') {
    clearInterval(refreshTimer);
    state.rooms = [];
    dom.roomList.replaceChildren();
    dom.mainView.hidden = true;
    dom.loginView.hidden = false;
    dom.loginMessage.textContent = message;
    dom.username.focus();
}

function showMain(admin) {
    dom.adminName.textContent = admin.username;
    dom.loginView.hidden = true;
    dom.mainView.hidden = false;
    loadRooms();
    clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
        if (!document.hidden) loadRooms();
    }, REFRESH_MS);
}

dom.loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!dom.username.value.trim() || !dom.password.value) {
        dom.loginMessage.textContent = '請輸入帳號和密碼';
        return;
    }
    dom.loginBtn.disabled = true;
    dom.loginBtn.textContent = '登入中…';
    try {
        const admin = await apiRequest('/admin/login', {
            method: 'POST',
            body: {
                username: dom.username.value,
                password: dom.password.value,
            },
        });
        dom.password.value = '';
        dom.loginMessage.textContent = '';
        showMain(admin);
    } catch (error) {
        dom.loginMessage.textContent = error.message;
        dom.password.select();
    } finally {
        dom.loginBtn.disabled = false;
        dom.loginBtn.textContent = '登入';
    }
});

dom.logoutBtn.addEventListener('click', async () => {
    await apiRequest('/admin/logout', { method: 'POST' }).catch(() => {});
    showLogin();
});

/* ---------- 活動列表 ---------- */

function roomCard(room) {
    const busy = state.pending.has(room.id);

    const toggleBtn = el('button', {
        className: `btn ${room.allowVotes ? 'btn--danger' : 'btn--open'}`,
        text: room.allowVotes ? '停止點歌' : '開放點歌',
        attrs: { type: 'button' },
    });
    toggleBtn.disabled = busy;
    toggleBtn.addEventListener('click', () => toggleVotes(room));

    const resetBtn = el('button', {
        className: 'btn btn--ghost',
        text: '重置選歌',
        attrs: { type: 'button' },
    });
    resetBtn.disabled = busy;
    resetBtn.addEventListener('click', () => resetVotes(room));

    const progress = el('p', { className: 'room-progress' }, [
        el('span', { text: '已投票' }),
        el('strong', { text: `${room.votedCount}/${room.ticketCount}` }),
        el('span', {
            text: `（還有 ${room.ticketCount - room.votedCount} 張沒投）`,
        }),
    ]);

    return el('li', { className: 'admin-card room-card' }, [
        el('div', { className: 'room-head' }, [
            el('h2', { className: 'room-name', text: room.name }),
            el('span', {
                className: `room-status ${room.isOpen ? 'is-open' : 'is-closed'}`,
                text: room.isOpen ? '開放點歌中' : '已停止點歌',
            }),
        ]),
        progress,
        el('div', { className: 'room-actions' }, [toggleBtn, resetBtn]),
        el('p', {
            className: 'room-hint',
            text: '停止點歌時，觀眾畫面會被擋住不能點歌；重置選歌只清一般點歌，合唱點歌保留',
        }),
    ]);
}

function renderRooms() {
    if (state.rooms.length === 0) {
        dom.roomList.replaceChildren(
            el('li', { className: 'list-empty', text: '還沒有點歌活動' })
        );
        return;
    }
    dom.roomList.replaceChildren(...state.rooms.map(roomCard));
}

async function loadRooms() {
    try {
        const rooms = await apiRequest('/admin/rooms');
        // 有操作進行中就先不覆蓋，等操作完成再重抓
        if (state.pending.size > 0) return;
        state.rooms = rooms;
        renderRooms();
    } catch (error) {
        handleApiError(error);
    }
}

/** 鎖住該活動的按鈕執行操作，結束後重抓最新狀態 */
async function runRoomAction(room, action) {
    state.pending.add(room.id);
    renderRooms();
    try {
        await action();
    } catch (error) {
        handleApiError(error);
    } finally {
        state.pending.delete(room.id);
        await loadRooms();
    }
}

function toggleVotes(room) {
    const allowVotes = !room.allowVotes;
    return runRoomAction(room, async () => {
        await apiRequest(`/admin/rooms/${room.id}/allow-votes`, {
            method: 'PUT',
            body: { allowVotes },
        });
        toast(allowVotes ? '已開放點歌' : '已停止點歌，觀眾畫面會被擋住');
    });
}

/** 確認視窗：回傳使用者是否按了「確定清空」 */
function confirmReset(room) {
    dom.confirmText.textContent = `確定要清空「${room.name}」的一般點歌嗎？排行榜和投票進度會歸零，合唱點歌保留。這個動作無法復原。`;
    dom.confirmDialog.returnValue = '';
    dom.confirmDialog.showModal();
    return new Promise(resolve => {
        dom.confirmDialog.addEventListener(
            'close',
            () => resolve(dom.confirmDialog.returnValue === 'confirm'),
            { once: true }
        );
    });
}

async function resetVotes(room) {
    if (!(await confirmReset(room))) return;
    await runRoomAction(room, async () => {
        const { deleted } = await apiRequest(`/admin/rooms/${room.id}/votes`, {
            method: 'DELETE',
        });
        toast(`已重置選歌，清掉 ${deleted} 筆點歌`);
    });
}

/* ---------- 啟動：已登入就直接進後台 ---------- */

apiRequest('/admin/me')
    .then(showMain)
    .catch(() => showLogin());
