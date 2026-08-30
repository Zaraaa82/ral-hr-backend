const Document = require("../models/Document")
const AuditLog = require("../models/AuditLog");
const mongoose = require('mongoose')

async function createDocument(req, res) {
    try {
        const {
            employee,
            type,
            expiryDate
        } = req.body;

        let documentEmployee = employee;

        if (req.user.role === "Employee") {
            documentEmployee = req.user._id;
        }

        if (!req.file) {
            return res.status(400).json({
                message: "PDF document is required"
            });
        }

        const createdDoc = await Document.create({
            employee: documentEmployee,
            type,
            expiryDate,
            uploadedBy: req.user._id,
            fileUrl: req.file.path
        });

        await AuditLog.create({
            entityType: 'Document',
            recordId: createdDoc._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'create',
            new_value: createdDoc,
        })

        return res.status(201).json({ createdDoc });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

async function getOneDoc(req, res) {
    try {
        const { docId } = req.params

        if (!docId) {
            return res.status(404).json({
                message: 'Document not found.',
            })
        }

        const foundDoc = await Document.findById(docId).populate('employee uploadedBy verifiedBy')

        return res.status(201).json({ foundDoc });

    } catch (err) {
        console.error(err);

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

async function updateDocument(req, res) {
    try {
        const { docId } = req.params;

        const {
            employee,
            type,
            expiryDate
        } = req.body;

        if (!docId) {
            return res.status(400).json({
                message: 'Document ID is required.',
            });
        }

        const doc = await Document.findById(docId);

        if (!doc) {
            return res.status(404).json({
                message: 'Document not found.',
            });
        }

        if (req.user.role === "Employee" && doc.employee.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                message: "You are not the owner of this document.",
            });
        }

        const oldValue = doc.toObject();

        let documentEmployee = employee;

        if (req.user.role === "Employee") {
            documentEmployee = req.user._id;
        }

        if (documentEmployee) {
            doc.employee = documentEmployee;
        }

        if (type) {
            doc.type = type;
        }

        if (expiryDate) {
            doc.expiryDate = expiryDate;
        }

        if (req.file) {
        }
        doc.status = 'replaced'

        await doc.save();

        await AuditLog.create({
            entityType: 'Document',
            recordId: doc._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'update',
            old_value: oldValue,
            new_value: doc.toObject(),
        });

        return res.status(200).json({
            message: 'Document updated successfully.',
            document: doc,
        });

    } catch (err) {
        console.error(err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            });
        }

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

async function verifyDocument(req, res) {
    try {
        const { docId } = req.params;

        if (req.user.role != "HR Admin" && req.user.role != "Manager") {
            return res.status(403).json({
                message: "Only HR Admin or Manager can verify documents.",
            });
        }
        if (!docId) {
            return res.status(400).json({
                message: 'Document ID is required.',
            });
        }

        const doc = await Document.findById(docId);

        if (!doc) {
            return res.status(404).json({
                message: 'Document not found.',
            });
        }

        const oldValue = doc.toObject();

        doc.status = 'verified';

        await doc.save();

        await AuditLog.create({
            entityType: 'Document',
            recordId: doc._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'approve',
            old_value: oldValue,
            new_value: doc.toObject(),
        });

        return res.status(200).json({
            message: 'Document verified successfully.',
            doc,
        });

    } catch (err) {
        console.error(err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            });
        }

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

async function rejectDocument(req, res) {
    try {
        const { docId } = req.params;

        if (req.user.role != "HR Admin" && req.user.role != "Manager") {
            return res.status(403).json({
                message: "Only HR Admin or Manager can reject documents.",
            });
        }
        if (!docId) {
            return res.status(400).json({
                message: 'Document ID is required.',
            });
        }

        const doc = await Document.findById(docId);

        if (!doc) {
            return res.status(404).json({
                message: 'Document not found.',
            });
        }

        const oldValue = doc.toObject();

        doc.status = 'rejected';

        await doc.save();

        await AuditLog.create({
            entityType: 'Document',
            recordId: doc._id,
            changedBy: new mongoose.Types.ObjectId(req.user._id),
            action: 'reject',
            old_value: oldValue,
            new_value: doc.toObject(),
        });

        return res.status(200).json({
            message: 'Document rejected successfully.',
            doc,
        });

    } catch (err) {
        console.error(err);

        if (err.name === 'ValidationError') {
            return res.status(400).json({
                message: err.message,
            });
        }

        return res.status(500).json({
            message: "Internal Server Error"
        });
    }
}
module.exports = {
    createDocument,
    getOneDoc,
    updateDocument,
    verifyDocument,
    rejectDocument
};