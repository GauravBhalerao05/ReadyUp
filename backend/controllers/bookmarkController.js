import Bookmark from "../models/Bookmark.js";
import Question from "../models/Question.js";

export const getBookmarks = async (req, res) => {
    try {
        const bookmarks = await Bookmark.find({ student: req.user._id })
            .populate("question")
            .sort({ createdAt: -1 });

        // Transform into convenient list format
        const formatted = bookmarks
            .filter((b) => b.question)
            .map((b) => {
                const q = b.question.toObject();
                return {
                    _id: b._id,
                    bookmarkId: b._id,
                    questionId: q.questionId,
                    questionRef: q._id,
                    questionText: q.questionText,
                    options: q.options,
                    correctOption: q.correctOption,
                    explanation: q.explanation,
                    category: q.category,
                    topic: q.topic,
                    subtopic: q.subtopic,
                    difficulty: q.difficulty,
                    companies: q.companies,
                    notes: b.notes,
                    createdAt: b.createdAt,
                };
            });

        return res.json({
            success: true,
            message: "Bookmarks retrieved successfully",
            data: formatted,
        });
    } catch (error) {
        console.error("getBookmarks error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve bookmarks",
        });
    }
};

export const addBookmark = async (req, res) => {
    try {
        const { questionId, note = "" } = req.body;

        if (!questionId) {
            return res.status(400).json({
                success: false,
                message: "questionId is required",
            });
        }

        // Find question by _id or questionId
        let question = await Question.findOne({
            $or: [{ questionId: questionId.toUpperCase() }, { _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }],
        });

        if (!question) {
            return res.status(404).json({
                success: false,
                message: "Question not found",
            });
        }

        const existing = await Bookmark.findOne({
            student: req.user._id,
            question: question._id,
        });

        if (existing) {
            existing.notes = note || existing.notes;
            await existing.save();
            return res.json({
                success: true,
                message: "Bookmark updated successfully",
                data: existing,
            });
        }

        const bookmark = await Bookmark.create({
            student: req.user._id,
            question: question._id,
            questionId: question.questionId,
            notes: note ? note.trim() : "",
        });

        return res.status(201).json({
            success: true,
            message: "Question bookmarked successfully",
            data: {
                _id: bookmark._id,
                questionId: question.questionId,
                questionRef: question._id,
                notes: bookmark.notes,
                createdAt: bookmark.createdAt,
            },
        });
    } catch (error) {
        console.error("addBookmark error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to bookmark question",
        });
    }
};

export const removeBookmark = async (req, res) => {
    try {
        const { questionId } = req.params;

        // QuestionId may be a Mongo ID or string like QA-TW-001
        let question = await Question.findOne({
            $or: [{ questionId: questionId.toUpperCase() }, { _id: questionId.match(/^[0-9a-fA-F]{24}$/) ? questionId : null }],
        });

        const filter = {
            student: req.user._id,
            $or: [
                { questionId: questionId.toUpperCase() },
                { question: question ? question._id : null },
            ],
        };

        const result = await Bookmark.findOneAndDelete(filter);

        return res.json({
            success: true,
            message: "Bookmark removed successfully",
            data: null,
        });
    } catch (error) {
        console.error("removeBookmark error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to remove bookmark",
        });
    }
};
