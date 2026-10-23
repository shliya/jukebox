const express = require('express');

const router = new express.Router();
router.use('/health', require('./health'));
router.use('/auth', require('./auth'));
router.use('/songs', require('./song'));

module.exports = router;
