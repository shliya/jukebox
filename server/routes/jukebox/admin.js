const express = require('express');
const requireAdmin = require('../../middleware/require-admin');
const { rateLimitAdminLogin } = require('../../middleware/rate-limit');
const {
    handlePostLoginRequest,
    handlePostLogoutRequest,
    handleGetMeRequest,
    handleGetRoomsRequest,
    handlePutAllowVotesRequest,
    handleDeleteVotesRequest,
} = require('../../route-handlers/admin');

const router = new express.Router();

router.post('/login', rateLimitAdminLogin, handlePostLoginRequest);
router.post('/logout', handlePostLogoutRequest);

router.use(requireAdmin);
router.get('/me', handleGetMeRequest);
router.get('/rooms', handleGetRoomsRequest);
// 開放 / 停止點歌 { allowVotes: boolean }
router.put('/rooms/:roomId/allow-votes', handlePutAllowVotesRequest);
// 重置選歌：清空一般點歌（合唱保留）
router.delete('/rooms/:roomId/votes', handleDeleteVotesRequest);

module.exports = router;
