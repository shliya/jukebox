const express = require('express');
const requireTicket = require('../../middleware/require-ticket');
const { rateLimitVote } = require('../../middleware/rate-limit');
const {
    handleGetSongsRequest,
    handleGetRankingRequest,
    handlePutVoteRequest,
} = require('../../route-handlers/song');

const router = new express.Router();

// 全部需要票券登入；活動由票券決定，不用帶 slug
router.use(requireTicket);
router.get('/', handleGetSongsRequest);
router.get('/ranking', handleGetRankingRequest);
// 點歌 / 改選（一張票只有一筆）
router.put('/vote', rateLimitVote, handlePutVoteRequest);

module.exports = router;
