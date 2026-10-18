import mongoose from "mongoose";

const importBatchSchema = new mongoose.Schema(
    {
        batchId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        uploaderName: {
            type: String,
            default: "",
        },
        fileName: {
            type: String,
            required: true,
        },
        fileType: {
            type: String,
            default: "csv",
        },
        totalRows: {
            type: Number,
            default: 0,
        },
        validCount: {
            type: Number,
            default: 0,
        },
        errorCount: {
            type: Number,
            default: 0,
        },
        skippedCount: {
            type: Number,
            default: 0,
        },
        status: {
            type: String,
            enum: ["previewed", "confirmed", "failed"],
            default: "previewed",
        },
        previewRows: {
            type: Array,
            default: [],
        },
        errors: {
            type: Array,
            default: [],
        },
    },
    { timestamps: true }
);

const ImportBatch = mongoose.model("ImportBatch", importBatchSchema);

export default ImportBatch;
