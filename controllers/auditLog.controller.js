const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');


// =====================================================
// Get all audit logs
// HR Admin only
//
// GET /audit-logs
//
// Filters:
// ?entityType=Attendance
// ?action=correct
// ?changedBy=userId
// ?recordId=recordId
// ?from=2026-08-01
// ?to=2026-08-31
// ?page=1
// ?limit=20
// =====================================================

async function getAuditLogs(req, res) {
  try {
    const {
      entityType,
      action,
      changedBy,
      recordId,
      from,
      to,
    } = req.query;

    const page = Math.max(Number(req.query.page) || 1, 1);

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);

    const filter = {};

    // ================= Entity type =================

    if (entityType) {
      const allowedEntityTypes = AuditLog.schema.path('entityType').enumValues;

      if (!allowedEntityTypes.includes(entityType)) {
        return res.status(400).json({message: 'Invalid audit entity type.'});
      }

      filter.entityType = entityType;
    }


    // ================= Action =================

    if (action) {
      const allowedActions =
        AuditLog.schema.path('action').enumValues;

      if (!allowedActions.includes(action)) {
        return res.status(400).json({message: 'Invalid audit action.'});
      }

      filter.action = action;
    }


    // ================= Changed by =================

    if (changedBy) {
      if (!mongoose.Types.ObjectId.isValid(changedBy)) {
        return res.status(400).json({message: 'Invalid changedBy user ID.'});
      }

      filter.changedBy = changedBy;
    }


    // ================= Record =================

    if (recordId) {
      if (!mongoose.Types.ObjectId.isValid(recordId)) {
        return res.status(400).json({message: 'Invalid record ID.'});
      }

      filter.recordId = recordId;
    }


    // ================= Date range =================

    if (from || to) {
      filter.changedAt = {};

      if (from) {
        const fromDate = new Date(from);

        if (Number.isNaN(fromDate.getTime())) {
          return res.status(400).json({message: 'Invalid from date.'});
        }

        filter.changedAt.$gte = fromDate;
      }

      if (to) {
        const toDate = new Date(to);

        if (Number.isNaN(toDate.getTime())) {
          return res.status(400).json({message: 'Invalid to date.'});
        }

        filter.changedAt.$lte = toDate;
      }
    }


    // ================= Retrieve logs =================

    const [auditLogs, total] = await Promise.all([
      AuditLog.find(filter).populate('changedBy', 'fullName employeeCode workEmail role')
      .sort({ changedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),

      AuditLog.countDocuments(filter)
    ]);


    return res.status(200).json({
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('getAuditLogs:', error);

    return res.status(500).json({message: 'Error retrieving audit logs.', error: error.message});
  }
}


// =====================================================
// Get one audit log
// GET /audit-logs/:id
// =====================================================

async function getAuditLogById(req, res) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({message: 'Invalid audit log ID.'});
    }

    const auditLog = await AuditLog.findById(id).populate('changedBy', 'fullName employeeCode workEmail role').lean();

    if (!auditLog) {
      return res.status(404).json({message: 'Audit log not found.'});
    }

    return res.status(200).json(auditLog);

  } catch (error) {
    console.error('getAuditLogById:', error);

    return res.status(500).json({message: 'Error retrieving audit log.', error: error.message});
  }
}


// =====================================================
// Get history for one specific record
//
// Example:
// GET /audit-logs/record/Attendance/123456...
//
// Useful when HR opens an attendance record,
// employee, document, leave request, etc.
// =====================================================

async function getRecordAuditHistory(req, res) {
  try {
    const {
      entityType,
      recordId,
    } = req.params;

    const allowedEntityTypes =
      AuditLog.schema.path('entityType').enumValues;

    if (!allowedEntityTypes.includes(entityType)) {
      return res.status(400).json({
        message: 'Invalid audit entity type.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(recordId)) {
      return res.status(400).json({message: 'Invalid record ID.'});
    }

    const auditLogs = await AuditLog.find({entityType, recordId})
      .populate('changedBy', 'fullName employeeCode workEmail role').sort({changedAt: -1}).lean();

    return res.status(200).json(auditLogs);

  } catch (error) {
    console.error('getRecordAuditHistory:', error);

    return res.status(500).json({message: 'Error retrieving audit history.', error: error.message});
  }
}


module.exports = {
  getAuditLogs,
  getAuditLogById,
  getRecordAuditHistory,
};