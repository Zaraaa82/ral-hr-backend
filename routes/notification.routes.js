const router = require('express').Router();

const verifyToken = require('../middleware/verifyToken');

const notificationController = require('../controllers/notification.controller');


router.use(verifyToken);


// Get own notifications
router.get('/', notificationController.getMyNotifications);


// Get unread count
router.get('/unread-count', notificationController.getUnreadNotificationCount);


// Mark all as read
router.patch('/read-all', notificationController.markAllNotificationsAsRead);


// Mark one as read
router.patch('/:id/read', notificationController.markNotificationAsRead);


module.exports = router;