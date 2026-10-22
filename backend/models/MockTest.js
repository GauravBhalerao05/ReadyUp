import mongoose from "mongoose";

const mockTestSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ["company", "company_mock", "grand", "topic", "topic_test", "diagnostic"],
            default: "company_mock",
            index: true,
        },
        description: {
            type: String,
            default: "",
        },
        company: {
            type: String,
            default: "",
            trim: true,
        },
        durationMinutes: {
            type: Number,
            required: true,
            default: 30,
        },
        totalQuestions: {
            type: Number,
            required: true,
            default: 15,
        },
        passingScore: {
            type: Number,
            default: 60,
        },
        category: {
            type: String,
            default: "Mixed",
        },
        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            default: "medium",
        },
        questions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Question",
            },
        ],
        attemptsCount: {
            type: Number,
            default: 0,
        },
        averageScore: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
    },
    { timestamps: true }
);

const MockTest = mongoose.model("MockTest", mockTestSchema);

export default MockTest;
