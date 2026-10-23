const API_BASE = '/api/v1';

/**
 * 呼叫後端 API；失敗時丟出含後端 message / status 的 Error
 * 同網域請求，fetch 預設會帶上票券登入的 cookie
 * @param {string} path
 * @param {{ method?: string, body?: object }} [options]
 */
export async function apiRequest(path, { method = 'GET', body } = {}) {
    const headers = {};
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
        const error = new Error(json.message || `請求失敗（${res.status}）`);
        error.status = res.status;
        throw error;
    }
    return json.data;
}

export function formatDuration(sec) {
    if (sec == null) return '';
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

export function songLabel(song) {
    return song.artist ? `${song.title} - ${song.artist}` : song.title;
}

/** 建立元素的小工具（一律用 textContent，避免 XSS） */
export function el(tag, { className, text, attrs } = {}, children = []) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    if (attrs) {
        Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    }
    children.forEach(child => node.appendChild(child));
    return node;
}
