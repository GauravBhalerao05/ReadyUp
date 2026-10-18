import ExcelJS from "exceljs";
import Question from "../models/Question.js";
import MockTest from "../models/MockTest.js";
import ImportBatch from "../models/ImportBatch.js";
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
                categoryBreakdown: categories.map((c) => ({
                    category: c._id || "Unassigned",
                    count: c.count,
                })),
                recentImports: importHistory.map((b) => ({
                    batchId: b.batchId,
                    fileName: b.fileName,
                    date: b.createdAt,
                    totalRows: b.totalRows,
                    importedCount: b.validCount,
                    status: b.status === "confirmed" ? "Completed" : "Previewed",
                    uploadedBy: b.uploaderName || "Coordinator",
                })),
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
                // Strip spreadsheet formula trigger prefixes for security
                return cellText.replace(/^([=+\-@])/, "'$1").trim();
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
            const correct = (row.correctoption || row.answer || "").toUpperCase();
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

            const existingInDb = await Question.findOne({ questionId: qId });
            const isDuplicateInDb = Boolean(existingInDb);

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
                    questionId: qId,
                    messages: rowErrors,
                });
            } else {
                validRows.push(formattedRow);
            }
        }

        const batchId = `BATCH-${Date.now().toString().slice(-6)}`;

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
        });

        return res.json({
            success: true,
            message: `Spreadsheet parsed. ${validRows.length} valid rows, ${validationErrors.length} errors found.`,
            data: {
                importBatchId: batch.batchId,
                fileName,
                totalRows: rows.length,
                validRowsCount: validRows.length,
                invalidRowsCount: validationErrors.length,
                rows: validRows.slice(0, 50), // Sample for UI preview
                errors: validationErrors,
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
        const { importBatchId } = req.body;

        if (!importBatchId) {
            return res.status(400).json({
                success: false,
                message: "importBatchId is required",
            });
        }

        const batch = await ImportBatch.findOne({ batchId: importBatchId });
        if (!batch) {
            return res.status(404).json({
                success: false,
                message: "Import batch not found or already expired",
            });
        }

        if (batch.status === "confirmed") {
            return res.status(409).json({
                success: false,
                message: "This import batch has already been committed.",
            });
        }

        let insertedCount = 0;
        let updatedCount = 0;

        for (const item of batch.previewRows) {
            const filter = { questionId: item.questionId };
            const doc = {
                questionId: item.questionId,
                questionText: item.questionText,
                options: item.options,
                correctOption: item.correctOption,
                explanation: item.explanation,
                category: item.category,
                topic: item.topic,
                subtopic: item.subtopic,
                difficulty: item.difficulty,
                companies: item.companies,
                source: item.source,
                year: item.year,
                isVerified: true,
                isActive: true,
            };

            const result = await Question.findOneAndUpdate(filter, { $set: doc }, { upsert: true, new: false });
            if (result) {
                updatedCount += 1;
            } else {
                insertedCount += 1;
            }
        }

        batch.status = "confirmed";
        await batch.save();

        await logAuditEvent({
            action: "SPREADSHEET_IMPORT",
            user: req.user,
            targetType: "IMPORT",
            targetId: batch.batchId,
            details: `Committed spreadsheet batch: ${insertedCount} inserted, ${updatedCount} updated from ${batch.fileName}`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: `Import confirmed successfully. ${insertedCount} new questions added, ${updatedCount} updated.`,
            data: {
                batchId: batch.batchId,
                insertedCount,
                updatedCount,
                totalProcessed: insertedCount + updatedCount,
            },
        });
    } catch (error) {
        console.error("confirmImport error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to confirm spreadsheet import",
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
                batchId: b.batchId,
                fileName: b.fileName,
                fileType: b.fileType,
                totalRows: b.totalRows,
                validCount: b.validCount,
                errorCount: b.errorCount,
                status: b.status,
                uploadedBy: b.uploaderName,
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
