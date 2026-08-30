function isActiveUser(req, res, next) {
    if (req.user.status !== 'active') {
        return res.status(403).json({
            message: 'Access denied. active users only.',
        })
    }

    next()
}

module.exports = isActiveUser