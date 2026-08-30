function requireHRAdmin(req, res, next) {
    if (req.user.role !== 'HR Admin') {
        return res.status(403).json({
            message: 'Access denied. HR Admin only.',
        })
    }

    next()
}

module.exports = requireHRAdmin