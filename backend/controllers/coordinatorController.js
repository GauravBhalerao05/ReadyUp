import mongoose from "mongoose";
import ExcelJS from "exceljs";
import Question from "../models/Question.js";
import MockTest from "../models/MockTest.js";
import ImportBatch from "../models/ImportBatch.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getCoordinatorDashboard = async (req, res) => {
    try {
        const [totalQ, activeQ, verifiedQ, totalTests, importHistory] = await Promise.all([
            Question.countDocuments(),
            Question.countDocuments({ isActive: true }),
            Question.countDocuments({ isVerified: true }),
            MockTest.countDocuments({ isActive: true }),
            ImportBatch.find().sort({ createdAt: -1 }).limit(5),
        ]);

        const categories = await Question.aggregate([
            { $group: { _id: "$category", count: { $sum: 1 } } },
        ]);

        const metricCards = [
            {
                label: "Total Questions",
                value: totalQ,
                subtext: `${activeQ} active in live repository`,
                icon: "BookOpen",
                color: "teal",
            },
            {
                label: "Verified Content",
                value: verifiedQ,
                subtext: "Reviewed by placement faculty",
                icon: "CheckCircle2",
                color: "emerald",
            },
            {
                label: "Active Mock Tests",
                value: totalTests,
                subtext: "Available for student simulations",
                icon: "FolderGit2",
                color: "amber",
            },
            {
                label: "Pending Review",
                value: totalQ - verifiedQ,
                subtext: "Requires coordinator validation",
                icon: "FileSpreadsheet",
                color: "rose",
            },
        ];

        const formattedHistory = importHistory.map((b) => ({
            importBatchId: b.batchId,
            batchId: b.batchId,
            filename: b.fileName,
            fileName: b.fileName,
            uploadedAt: b.createdAt,
            date: b.createdAt,
            totalRows: b.totalRows,
            insertedCount: b.validCount || 0,
            importedCount: b.validCount || 0,
            status: b.status === "confirmed" ? "Completed" : "Previewed",
            uploaderName: b.uploaderName || "Coordinator",
            uploadedBy: b.uploaderName || "Coordinator",
        }));

        return res.json({
            success: true,
            message: "Coordinator dashboard retrieved successfully",
            data: {
                metrics: {
                    totalQuestions: totalQ,
                    activeQuestions: activeQ,
                    verifiedQuestions: verifiedQ,
                    needsReview: totalQ - verifiedQ,
                    activeTests: totalTests,
                    pendingImports: 0,
                },
                metricCards,
                categoryBreakdown: categories.map((c) => ({
                    category: c._id || "Unassigned",
                    count: c.count,
                })),
                recentImports: formattedHistory,
                importHistory: formattedHistory,
            },
        });
    } catch (error) {
        console.error("getCoordinatorDashboard error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve coordinator dashboard",
        });
    }
};

export const getImportTemplate = async (req, res) => {
    try {
        const csvHeader =
            "questionId,questionText,optionA,optionB,optionC,optionD,correctOption,explanation,category,topic,subtopic,difficulty,companies,source,year\n" +
            'QA-TW-001,"A can do a work in 12 days, B in 18 days. If they work together for 4 days, what fraction remains?","4/9","5/9","1/3","2/5",A,"1 - 4*(5/36) = 4/9","Quantitative Aptitude","Time and Work","Combined Work",easy,"TCS, Infosys","TCS NQT 2024",2024\n';

        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
            "Content-Disposition",
            'attachment; filename="readyup_questions_template.csv"'
        );
        return res.send(csvHeader);
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Failed to generate template",
        });
    }
};

// Safe parser for spreadsheet rows (handles both Excel and CSV via ExcelJS buffer)
export const previewImport = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No spreadsheet file uploaded.",
            });
        }

        const buffer = req.file.buffer;
        const fileName = req.file.originalname;
        const isCsv = fileName.toLowerCase().endsWith(".csv");

        const workbook = new ExcelJS.Workbook();
        if (isCsv) {
            // Read CSV stream from buffer
            const stream = await import("stream");
            const readable = stream.Readable.from(buffer);
            await workbook.csv.read(readable);
        } else {
            await workbook.xlsx.load(buffer);
        }

        const worksheet = workbook.worksheets[0];
        if (!worksheet) {
            return res.status(400).json({
                success: false,
                message: "Uploaded spreadsheet is empty or has no readable sheet.",
            });
        }

        const rows = [];
        let headers = [];

        worksheet.eachRow((row, rowNumber) => {
            const values = Array.isArray(row.values) ? row.values.slice(1) : [];
            // Clean values and sanitize formula injection (=, +, -, @ prefix)
            const cleanValues = values.map((val) => {
                let cellText = "";
                if (val && typeof val === "object") {
                    cellText = val.text || val.result || JSON.stringify(val);
                } else if (val !== null && val !== undefined) {
                    cellText = String(val);
                }
                // Strip spreadsheet formula trigger prefixes for security without corrupting legitimate negative numbers
                return cellText.replace(/^=/, "'=").trim();
            });

            if (rowNumber === 1) {
                headers = cleanValues.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));
            } else if (cleanValues.some(Boolean)) {
                const rowObj = {};
                headers.forEach((h, idx) => {
                    rowObj[h] = cleanValues[idx] || "";
                });
                rowObj._rowNumber = rowNumber;
                rows.push(rowObj);
            }
        });

        if (rows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Spreadsheet contains no data rows.",
            });
        }

        // Perform a single batch query for candidate question IDs to avoid O(N) sequential database round trips
        const candidateQuestionIds = rows
            .map((r) => (r.questionid || r.id || `IMP-${r._rowNumber}`).trim().toUpperCase())
            .filter(Boolean);

        const existingDbQuestions = await Question.find(
            { questionId: { $in: candidateQuestionIds } },
            { questionId: 1 }
        ).lean();
        const existingDbIdsSet = new Set(existingDbQuestions.map((q) => q.questionId));

        const validRows = [];
        const validationErrors = [];
        const seenIds = new Set();

        for (const row of rows) {
            const rowNum = row._rowNumber;
            const qId = (row.questionid || row.id || `IMP-${rowNum}`).toUpperCase();
            const qText = row.questiontext || row.question || "";
            const optA = row.optiona || row.a || "";
            const optB = row.optionb || row.b || "";
            const optC = row.optionc || row.c || "";
            const optD = row.optiond || row.d || "";
            const correct = (row.correctoption || row.answer || "").trim().toUpperCase();
            const category = row.category || "Quantitative Aptitude";
            const topic = row.topic || "General";
            const difficulty = (row.difficulty || "medium").toLowerCase();

            const rowErrors = [];

            if (!qText) rowErrors.push("Question text is required");
            if (!optA || !optB) rowErrors.push("Options A and B are required");
            if (!["A", "B", "C", "D"].includes(correct)) {
                rowErrors.push(`Correct option must be A, B, C, or D (got '${correct}')`);
            }
            if (seenIds.has(qId)) {
                rowErrors.push(`Duplicate questionId '${qId}' within this file`);
            } else {
                seenIds.add(qId);
            }

            const isDuplicateInDb = existingDbIdsSet.has(qId);

            const options = [
                { optionId: "A", text: optA },
                { optionId: "B", text: optB },
            ];
            if (optC) options.push({ optionId: "C", text: optC });
            if (optD) options.push({ optionId: "D", text: optD });

            const formattedRow = {
                rowNumber: rowNum,
                questionId: qId,
                questionText: qText,
                options,
                correctOption: correct,
                explanation: row.explanation || "",
                category,
                topic,
                subtopic: row.subtopic || "",
                difficulty: ["easy", "medium", "hard"].includes(difficulty) ? difficulty : "medium",
                companies: row.companies ? row.companies.split(",").map((c) => c.trim()).filter(Boolean) : [],
                source: row.source || "Bulk Import",
                year: row.year ? Number(row.year) : new Date().getFullYear(),
                isDuplicateInDb,
                status: rowErrors.length === 0 ? (isDuplicateInDb ? "Duplicate (Will Update)" : "Valid") : "Invalid",
                errors: rowErrors,
            };

            if (rowErrors.length > 0) {
                validationErrors.push({
                    row: rowNum,
                    rowNumber: rowNum,
                    questionId: qId,
                    field: rowErrors[0].includes("option") ? "correctOption" : (rowErrors[0].includes("Question") ? "questionText" : "general"),
                    error: rowErrors.join(", "),
                    messages: rowErrors,
                });
            } else {
                validRows.push(formattedRow);
            }
        }

        const batchId = `BATCH-${Date.now().toString().slice(-6)}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour lifespan

        const batch = await ImportBatch.create({
            batchId,
            uploadedBy: req.user._id,
            uploaderName: req.user.name,
            fileName,
            fileType: isCsv ? "csv" : "xlsx",
            totalRows: rows.length,
            validCount: validRows.length,
            errorCount: validationErrors.length,
            skippedCount: 0,
            status: "previewed",
            previewRows: validRows,
            errors: validationErrors,
            expiresAt,
        });

        return res.json({
            success: true,
            message: `Spreadsheet parsed. ${validRows.length} valid rows, ${validationErrors.length} errors found.`,
            data: {
                batchId: batch.batchId,
                importBatchId: batch.batchId,
                fileName,
                totalRows: rows.length,
                validRowsCount: validRows.length,
                invalidRowsCount: validationErrors.length,
                rows: validRows.slice(0, 50), // Sample for UI preview
                validRows,
                previewSample: validRows.slice(0, 5),
                errors: validationErrors,
                expiresAt: batch.expiresAt,
            },
        });
    } catch (error) {
        console.error("previewImport error:", error.message);
        return res.status(500).json({
            success: false,
            message: `Failed to process spreadsheet: ${error.message}`,
        });
    }
};

export const confirmImport = async (req, res) => {
    try {
        const batchIdentifier = req.body.importBatchId || req.body.batchId;

        if (!batchIdentifier || typeof batchIdentifier !== "string" || !batchIdentifier.trim()) {
            return res.status(400).json({
                success: false,
                message: "A valid importBatchId or batchId is required.",
                code: "INVALID_BATCH_ID",
            });
        }

        const trimmedId = batchIdentifier.trim();
        const query = mongoose.Types.ObjectId.isValid(trimmedId)
            ? { $or: [{ batchId: trimmedId }, { _id: trimmedId }] }
            : { batchId: trimmedId };

        const batch = await ImportBatch.findOne(query);
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: "Import batch not found. Please upload and preview the spreadsheet again.",
                code: "BATCH_NOT_FOUND",
            });
        }

        // Check if batch is genuinely expired
        if (batch.expiresAt && new Date() > new Date(batch.expiresAt)) {
            return res.status(410).json({
                success: false,
                message: "Import batch has expired. Please upload and preview the spreadsheet again.",
                code: "BATCH_EXPIRED",
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    expiredAt: batch.expiresAt,
                },
            });
        }

        // Idempotency: check if already confirmed
        if (batch.status === "confirmed" || batch.status === "completed") {
            return res.status(409).json({
                success: false,
                message: "This import batch has already been confirmed and published.",
                code: "BATCH_ALREADY_CONFIRMED",
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    status: batch.status,
                    totalProcessed: batch.validCount || batch.previewRows?.length || 0,
                    insertedCount: batch.validCount || batch.previewRows?.length || 0,
                    updatedCount: 0,
                    skippedCount: batch.skippedCount || 0,
                    failedCount: 0,
                },
            });
        }

        if (!Array.isArray(batch.previewRows) || batch.previewRows.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Import batch contains no valid preview rows to publish.",
                code: "EMPTY_BATCH",
            });
        }

        // Identify existing questions to accurately calculate inserted vs updated
        const previewQuestionIds = batch.previewRows.map((item) => item.questionId);
        const existingDocs = await Question.find(
            { questionId: { $in: previewQuestionIds } },
            { questionId: 1 }
        ).lean();
        const existingIdSet = new Set(existingDocs.map((doc) => doc.questionId));

        const bulkOps = batch.previewRows.map((item) => ({
            updateOne: {
                filter: { questionId: item.questionId },
                update: {
                    $set: {
                        questionId: item.questionId,
                        questionText: item.questionText,
                        options: item.options,
                        correctOption: item.correctOption,
                        explanation: item.explanation || "",
                        category: item.category,
                        topic: item.topic,
                        subtopic: item.subtopic || "",
                        difficulty: item.difficulty || "medium",
                        companies: Array.isArray(item.companies) ? item.companies : [],
                        source: item.source || "Bulk Import",
                        year: Number(item.year) || new Date().getFullYear(),
                        isVerified: true,
                        isActive: true,
                    },
                },
                upsert: true,
            },
        }));

        let insertedCount = 0;
        let updatedCount = 0;
        let failedCount = 0;
        const failedItems = [];

        try {
            await Question.bulkWrite(bulkOps, { ordered: false });
            for (const item of batch.previewRows) {
                if (existingIdSet.has(item.questionId)) {
                    updatedCount += 1;
                } else {
                    insertedCount += 1;
                }
            }
        } catch (bulkErr) {
            console.error("Bulk write error during import confirmation:", bulkErr.message);
            if (bulkErr.writeErrors && bulkErr.writeErrors.length > 0) {
                const failedIndexes = new Set(bulkErr.writeErrors.map((we) => we.index));
                for (let i = 0; i < batch.previewRows.length; i++) {
                    const item = batch.previewRows[i];
                    if (failedIndexes.has(i)) {
                        failedCount += 1;
                        const errInfo = bulkErr.writeErrors.find((we) => we.index === i);
                        failedItems.push({
                            questionId: item.questionId,
                            error: errInfo?.errmsg || "Write failed",
                        });
                    } else if (existingIdSet.has(item.questionId)) {
                        updatedCount += 1;
                    } else {
                        insertedCount += 1;
                    }
                }
            } else {
                throw bulkErr;
            }
        }

        if (failedCount > 0 && insertedCount + updatedCount === 0) {
            batch.status = "failed";
            await batch.save();
            return res.status(500).json({
                success: false,
                message: `Failed to import questions: All ${failedCount} rows failed schema validation or database writes.`,
                data: {
                    batchId: batch.batchId,
                    importBatchId: batch.batchId,
                    insertedCount: 0,
                    updatedCount: 0,
                    skippedCount: batch.skippedCount || 0,
                    failedCount,
                    failedItems,
                    totalProcessed: 0,
                },
            });
        }

        batch.status = "confirmed";
        batch.validCount = insertedCount + updatedCount;
        await batch.save();

        await logAuditEvent({
            action: "SPREADSHEET_IMPORT",
            user: req.user,
            targetType: "IMPORT",
            targetId: batch.batchId,
            details: `Committed spreadsheet batch: ${insertedCount} inserted, ${updatedCount} updated${failedCount > 0 ? `, ${failedCount} failed` : ""} from ${batch.fileName}`,
            ipAddress: req.ip,
        });

        // Dynamic notifications for imported questions
        if (insertedCount > 0) {
            try {
                const students = await User.find({ role: "student", isActive: true }).select("_id");
                if (students.length > 0) {
                    const sampleTopic = batch.previewRows[0]?.topic || "General";
                    const sampleCategory = batch.previewRows[0]?.category || "";
                    const notifications = students.map((s) => ({
                        user: s._id,
                        title: "New Questions Added",
                        message: `${insertedCount} new question(s) were imported and published to the question bank.`,
                        type: "info",
                        link: sampleCategory ? `/practice?topic=${encodeURIComponent(sampleTopic)}&category=${encodeURIComponent(sampleCategory)}` : "/practice",
                        isRead: false,
                    }));
                    await Notification.insertMany(notifications);
                }
            } catch (notifErr) {
                console.error("Failed to dispatch spreadsheet import notifications:", notifErr.message);
            }
        }

        return res.json({
            success: true,
            message: `Import confirmed successfully. ${insertedCount} new questions added, ${updatedCount} updated${failedCount > 0 ? `, ${failedCount} failed` : ""}.`,
            data: {
                batchId: batch.batchId,
                importBatchId: batch.batchId,
                insertedCount,
                updatedCount,
                skippedCount: batch.skippedCount || 0,
                failedCount,
                failedItems,
                totalProcessed: insertedCount + updatedCount,
            },
        });
    } catch (error) {
        console.error("confirmImport error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to confirm spreadsheet import: " + error.message,
        });
    }
};

export const getImportHistory = async (req, res) => {
    try {
        const history = await ImportBatch.find().sort({ createdAt: -1 }).limit(30);

        return res.json({
            success: true,
            message: "Import history retrieved successfully",
            data: history.map((b) => ({
                importBatchId: b.batchId,
                batchId: b.batchId,
                filename: b.fileName,
                fileName: b.fileName,
                fileType: b.fileType,
                totalRows: b.totalRows,
                insertedCount: b.validCount || 0,
                validCount: b.validCount || 0,
                updatedCount: 0,
                errorCount: b.errorCount || 0,
                status: b.status === "confirmed" ? "published" : b.status,
                uploaderName: b.uploaderName || "Coordinator",
                uploadedBy: b.uploaderName || "Coordinator",
                uploadedAt: b.createdAt,
                createdAt: b.createdAt,
            })),
        });
    } catch (error) {
        console.error("getImportHistory error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve import history",
        });
    }
};
