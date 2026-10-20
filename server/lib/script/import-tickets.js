/**
 * 票券碼整批匯入
 *
 * 從檔案匯入（每行一個 code，CSV 取第一欄；空行、格式不符的行會略過並列出）：
 *   npm run tickets:import -- --room demo --file ./tickets.csv
 *
 * 直接產生 N 組隨機碼並匯入，同時輸出成檔案（拿去印票）：
 *   npm run tickets:import -- --room demo --generate 300 --out ./tickets-demo.csv
 *
 * 活動不存在時加 --name 會自動建立：
 *   npm run tickets:import -- --room live-1015 --name "10/15 演唱會" --generate 300 --out ./t.csv
 *
 * 已存在的 code 一律略過（不會覆蓋、不會重複）。
 */
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const sequelize = require('../../config/database');
const RoomStore = require('../../store/room');
const TicketStore = require('../../store/ticket');
const {
    normalizeTicketCode,
    isValidTicketCode,
    generateTicketCode,
} = require('../ticket-code');

const MAX_GENERATE = 100000;

function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i++) {
        const key = argv[i];
        if (key.startsWith('--')) {
            args[key.slice(2)] = argv[i + 1];
            i++;
        }
    }
    return args;
}

function readCodesFromFile(filePath) {
    const lines = fs
        .readFileSync(filePath, 'utf8')
        .replace(/^﻿/, '')
        .split(/\r?\n/);
    const codes = new Set();
    const invalid = [];
    lines.forEach((line, index) => {
        const raw = line.split(',')[0].replace(/^"|"$/g, '');
        if (!raw.trim()) return;
        // 第一行是 CSV 標題（code / 票券碼）時略過
        if (index === 0 && /^(code|ticket|票券碼?)$/i.test(raw.trim())) return;
        const code = normalizeTicketCode(raw);
        if (!isValidTicketCode(code)) {
            invalid.push(`第 ${index + 1} 行：${line}`);
            return;
        }
        codes.add(code);
    });
    return { codes: [...codes], invalid };
}

function generateCodes(count) {
    const codes = new Set();
    while (codes.size < count) {
        codes.add(generateTicketCode());
    }
    return [...codes];
}

async function getOrCreateRoom(slug, name) {
    const room = await RoomStore.getRoomBySlug(slug);
    if (room) return room;
    if (!name) {
        throw new Error(
            `找不到活動 ${slug}（要自動建立請加 --name "活動名稱"）`
        );
    }
    console.log(`[tickets] 建立活動 ${slug}（${name}）`);
    return RoomStore.createRoom({ slug, name });
}

async function main() {
    const args = parseArgs(process.argv.slice(2));
    if (!args.room || (!args.file && !args.generate)) {
        console.log(
            '用法：--room <slug> (--file <path> | --generate <數量> --out <path>) [--name <活動名稱>]'
        );
        process.exitCode = 1;
        return;
    }

    let codes;
    let outPath = null;
    if (args.file) {
        const { codes: fileCodes, invalid } = readCodesFromFile(
            path.resolve(args.file)
        );
        if (invalid.length > 0) {
            console.warn(`[tickets] 略過 ${invalid.length} 行格式不符：`);
            invalid.slice(0, 20).forEach(line => console.warn(`  ${line}`));
        }
        codes = fileCodes;
    } else {
        const count = Number(args.generate);
        if (!Number.isInteger(count) || count <= 0 || count > MAX_GENERATE) {
            throw new Error(`--generate 需為 1 ~ ${MAX_GENERATE} 的整數`);
        }
        if (!args.out) {
            throw new Error('產生票券碼時必須加 --out，否則碼會無法取得');
        }
        outPath = path.resolve(args.out);
        if (fs.existsSync(outPath)) {
            throw new Error(`輸出檔已存在，不覆蓋：${outPath}`);
        }
        codes = generateCodes(count);
    }

    if (codes.length === 0) {
        console.log('[tickets] 沒有可匯入的票券碼');
        return;
    }

    const room = await getOrCreateRoom(args.room, args.name);
    const inserted = await TicketStore.bulkInsertTicketCodes(room.id, codes);
    console.log(
        `[tickets] 活動 ${room.slug}：新增 ${inserted.length} 筆，略過已存在 ${codes.length - inserted.length} 筆`
    );

    if (outPath) {
        fs.writeFileSync(outPath, `code\n${inserted.join('\n')}\n`, {
            flag: 'wx',
        });
        console.log(
            `[tickets] 已輸出 ${inserted.length} 組票券碼到 ${outPath}`
        );
    }
}

main()
    .catch(error => {
        console.error('[tickets] 失敗:', error.message || error);
        process.exitCode = 1;
    })
    .finally(() => sequelize.close());
