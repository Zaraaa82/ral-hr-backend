const mongoose = require('mongoose');
const Notification = require('../models/Notification');


// =====================================================
// Get logged-in user's notifications
// GET /notifications
// Optional: ?isRead=false&page=1&limit=20
// =====================================================

async function getMyNotifications(req, res) {
  try {
    const {isRead} = req.query;

    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const filter = {recipient: req.user._id};

    // Optional read/unread filter
    if (isRead !== undefined) {
      if (!['true', 'false'].includes(isRead)) {
        return res.status(400).json({message: 'isRead must be true or false.'});
      }

      filter.isRead = isRead === 'true';
    }

    const [notifications, total, unreadCount] =
      await Promise.all([
        
        Notification.find(filter).sort({createdAt: -1}).skip((page - 1) * limit).limit(limit).lean(),

        Notification.countDocuments(filter),

        Notification.countDocuments({
          recipient: req.user._id,
          isRead: false,
        }),
      ]);

    return res.status(200).json({
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('getMyNotifications:', error);

    return res.status(500).json({message: 'Error retrieving notifications.', error: error.message});
  }
}


// =====================================================
// Get unread notification count
// GET /notifications/unread-count
// =====================================================

async function getUnreadNotificationCount(req, res) {
  try {
    const unreadCount = await Notification.countDocuments({recipient: req.user._id,
      isRead: false,
    });

    return res.status(200).json({
      unreadCount,
    });

  } catch (error) {
    console.error('getUnreadNotificationCount:', error);

    return res.status(500).json({message: 'Error retrieving unread notification count.', error: error.message});
  }
}


// =====================================================
// Mark one notification as read
// PATCH /notifications/:id/read
// =====================================================

async function markNotificationAsRead(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({message: 'Invalid notification ID.'});
    }

    // recipient is included in the query so a user
    // cannot mark another user's notification as read.
    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          recipient: req.user._id,
        },
        {
          $set: {
            isRead: true,
          },
        },
        {
          new: true,
        }
      );

    if (!notification) {
      return res.status(404).json({message: 'Notification not found.'});
    }

    return res.status(200).json({message: 'Notification marked as read.', notification});

  } catch (error) {
    console.error('markNotificationAsRead:', error);

    return res.status(500).json({message: 'Error updating notification.', error: error.message});
  }
}


// =====================================================
// Mark all logged-in user's notifications as read
// PATCH /notifications/read-all
// =====================================================

async function markAllNotificationsAsRead(req, res) {
  try {
    const result = await Notification.updateMany(
        {recipient: req.user._id, isRead: false},
        {$set: {isRead: true}}
    );

    return res.status(200).json({message: 'All notifications marked as read.', updatedCount: result.modifiedCount});

  } catch (error) {
    console.error('markAllNotificationsAsRead:', error);

    return res.status(500).json({message: 'Error updating notifications.', error: error.message});
  }
}


module.exports = {
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};