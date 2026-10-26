module.exports = (req, res) => {
    res.json({ status: 'ok', data: { username: req.admin.username } });
};
