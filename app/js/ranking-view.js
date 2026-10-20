import { el, songLabel } from './api.js';

/**
 * 渲染排行榜（資料已由後端依票數排序）
 * @param {HTMLElement} container
 * @param {Array<{ id:number, title:string, artist:string, voteCount:number }>} ranking
 * @param {number|null} [highlightSongId] 自己點的歌
 */
export function renderRanking(container, ranking, highlightSongId = null) {
    container.replaceChildren();
    if (ranking.length === 0) {
        container.appendChild(
            el('li', { className: 'empty', text: '還沒有人點歌' })
        );
        return;
    }
    ranking.forEach((song, index) => {
        const isMine = song.id === highlightSongId;
        container.appendChild(
            el('li', { className: `rank-item${isMine ? ' is-mine' : ''}` }, [
                el('span', {
                    className: 'rank-no',
                    text: String(index + 1),
                }),
                el('span', {
                    className: 'rank-title',
                    text: songLabel(song),
                }),
                el('span', {
                    className: 'rank-votes',
                    text: `${song.voteCount} 票`,
                }),
            ])
        );
    });
}
