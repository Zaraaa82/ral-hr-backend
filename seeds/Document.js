const fs = require("fs");
const path = require("path");
const os = require("os");

const Document = require("../models/Document");
const User = require("../models/User");

const documentData = require("./Data/documentData");

async function seedDocuments() {
  try {
    await Document.deleteMany({});

    // Get all users so we can convert employee codes to ObjectIds.
    const users = await User.find({});

    const userMap = {};

    users.forEach((user) => {
      userMap[user.employeeCode] = user._id;
    });

    // PDFs stored inside the repository.
    const sourceDirectory = path.join(
        __dirname,
        "files",
        "documents",
        "seed-documents",
    );

    // Same place as normal uploaded documents.
    // Windows example:
    // C:\Users\User\Documents\hrmDocs
    const documentsDirectory = path.join(
      os.homedir(),
      "Documents",
      "hrmDocs",
    );

    // Create hrmDocs if it does not already exist.
    fs.mkdirSync(documentsDirectory, {
      recursive: true,
    });

    const documents = [];

    for (const data of documentData) {
      const employee = userMap[data.employeeCode];
      const uploadedBy = userMap[data.uploadedByCode];

      if (!employee) {
        throw new Error(
          `Employee not found: ${data.employeeCode}`,
        );
      }

      if (!uploadedBy) {
        throw new Error(
          `Uploader not found: ${data.uploadedByCode}`,
        );
      }

      const sourcePath = path.join(
        sourceDirectory,
        data.fileName,
      );

      if (!fs.existsSync(sourcePath)) {
        throw new Error(
          `Document file not found: ${sourcePath}`,
        );
      }

      const destinationPath = path.join(
        documentsDirectory,
        data.fileName,
      );

      // Copy the real PDF into hrmDocs.
      fs.copyFileSync(
        sourcePath,
        destinationPath,
      );

      const document = {
        employee,
        type: data.type,
        expiryDate: data.expiryDate,
        uploadedBy,
        status: data.status,

        // Store the real filesystem location.
        fileUrl: destinationPath,
      };

      if (data.verifiedByCode) {
        const verifiedBy =
          userMap[data.verifiedByCode];

        if (!verifiedBy) {
          throw new Error(
            `Verifier not found: ${data.verifiedByCode}`,
          );
        }

        document.verifiedBy = verifiedBy;
      }

      if (data.verifiedOn) {
        document.verifiedOn = data.verifiedOn;
      }

      if (data.rejectionReason) {
        document.rejectionReason =
          data.rejectionReason;
      }

      documents.push(document);
    }

    await Document.insertMany(documents);

    console.log(
      `${documents.length} document seeds added successfully`,
    );
  } catch (error) {
    console.error(
      "Error seeding documents:",
      error,
    );

    throw error;
  }
}

module.exports = seedDocuments;