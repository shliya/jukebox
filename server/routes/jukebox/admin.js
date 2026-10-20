const express = require('express');
const requireAdmin = require('../../middleware/require-admin');
const {
    handleGetOverviewRequest,
    handlePostSongRequest,
} = require('../../route-handlers/admin');

const router = new express.Router();

router.use(requireAdmin);
router.get('/rooms/:slug', handleGetOverviewRequest);
router.post('/rooms/:slug/songs', handlePostSongRequest);

module.exports = router;
