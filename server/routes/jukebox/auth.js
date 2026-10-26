const express = require('express');
const requireTicket = require('../../middleware/require-ticket');
const { rateLimitLogin } = require('../../middleware/rate-limit');
const {
    handlePostLoginRequest,
    handleGetMeRequest,
} = require('../../route-handlers/auth');

const router = new express.Router();

router.post('/login', rateLimitLogin, handlePostLoginRequest);
router.get('/me', requireTicket, handleGetMeRequest);

module.exports = router;
