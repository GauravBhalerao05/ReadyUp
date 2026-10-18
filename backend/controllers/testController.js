import MockTest from "../models/MockTest.js";
import Question from "../models/Question.js";
import Attempt from "../models/Attempt.js";
import { logAuditEvent } from "../utils/auditLogger.js";

export const getMockTests = async (req, res) => {
    try {
        const { type, category, difficulty } = req.query;
        const filter = { isActive: true };

        if (type) filter.type = type;
        if (category) filter.category = new RegExp(category, "i");
        if (difficulty) filter.difficulty = difficulty.toLowerCase();

        const tests = await MockTest.find(filter)
            .select("-questions")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            message: "Mock tests retrieved successfully",
            data: tests,
        });
    } catch (error) {
        console.error("getMockTests error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock tests",
        });
    }
};

export const getMockTestById = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await MockTest.findById(id).select("-questions");

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        return res.json({
            success: true,
            message: "Mock test retrieved successfully",
            data: test,
        });
    } catch (error) {
        console.error("getMockTestById error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve mock test",
        });
    }
};

export const startPractice = async (req, res) => {
    try {
        const {
            category,
            topic,
            subtopic,
            difficulty,
            company,
            count = 10,
        } = req.body;

        const filter = { isActive: true };
        if (category) filter.category = new RegExp(`^${category}$`, "i");
        if (topic) filter.topic = new RegExp(`^${topic}$`, "i");
        if (subtopic) filter.subtopic = new RegExp(`^${subtopic}$`, "i");
        if (difficulty) filter.difficulty = difficulty.toLowerCase();
        if (company) filter.companies = new RegExp(company, "i");

        const limitCount = Math.min(50, Math.max(3, parseInt(count, 10) || 10));

        // Random or latest sample of matching questions
        const questions = await Question.aggregate([
            { $match: filter },
            { $sample: { size: limitCount } },
        ]);

        if (!questions || questions.length === 0) {
            // Fallback to any active questions if none match strict filter
            const fallback = await Question.find({ isActive: true }).limit(limitCount);
            if (!fallback || fallback.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "No questions currently available for this selection.",
                });
            }
            questions.push(...fallback);
        }

        const title = topic
            ? `${topic} Practice Drill`
            : category
            ? `${category} Practice Session`
            : "Mixed Aptitude Practice";

        // Snapshot question objects so updates to questions collection don't alter test history
        const questionSnapshots = questions.map((q) => ({
            questionRef: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
            userAnswer: null,
            isCorrect: false,
            timeSpentSeconds: 0,
        }));

        const durationMinutes = Math.max(5, Math.round(questions.length * 1.5));

        const attempt = await Attempt.create({
            student: req.user._id,
            type: "practice",
            title,
            category: category || "Mixed",
            topic: topic || "Mixed Topics",
            difficulty: difficulty || "Mixed",
            durationMinutes,
            totalQuestions: questions.length,
            questions: questionSnapshots,
            totalMarks: questions.length,
            status: "in-progress",
            startTime: new Date(),
        });

        // Strip correct answers and explanations before sending to client
        const safeQuestions = questions.map((q) => ({
            _id: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
        }));

        return res.status(201).json({
            success: true,
            message: "Practice session initialized successfully",
            data: {
                attemptId: attempt._id,
                title: attempt.title,
                type: attempt.type,
                durationMinutes: attempt.durationMinutes,
                totalQuestions: attempt.totalQuestions,
                startTime: attempt.startTime,
                questions: safeQuestions,
            },
        });
    } catch (error) {
        console.error("startPractice error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to initialize practice drill",
        });
    }
};

export const startMockTest = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await MockTest.findById(id).populate({
            path: "questions",
            match: { isActive: true },
        });

        if (!test) {
            return res.status(404).json({
                success: false,
                message: "Mock test not found",
            });
        }

        let testQuestions = test.questions || [];
        if (testQuestions.length === 0) {
            // Find questions matching test category / company
            const qFilter = { isActive: true };
            if (test.company) qFilter.companies = new RegExp(test.company, "i");
            if (test.category && test.category !== "Mixed") qFilter.category = new RegExp(test.category, "i");
            testQuestions = await Question.find(qFilter).limit(test.totalQuestions || 15);
        }

        const questionSnapshots = testQuestions.map((q) => ({
            questionRef: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            correctOption: q.correctOption,
            explanation: q.explanation,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
            userAnswer: null,
            isCorrect: false,
            timeSpentSeconds: 0,
        }));

        const attempt = await Attempt.create({
            student: req.user._id,
            type: "mock-test",
            mockTest: test._id,
            title: test.title,
            category: test.category,
            difficulty: test.difficulty,
            durationMinutes: test.durationMinutes,
            totalQuestions: questionSnapshots.length,
            questions: questionSnapshots,
            totalMarks: questionSnapshots.length,
            status: "in-progress",
            startTime: new Date(),
        });

        // Strip correctOption and explanation
        const safeQuestions = testQuestions.map((q) => ({
            _id: q._id,
            questionId: q.questionId,
            questionText: q.questionText,
            options: q.options,
            category: q.category,
            topic: q.topic,
            difficulty: q.difficulty,
        }));

        return res.status(201).json({
            success: true,
            message: "Mock test started. Timer is now running.",
            data: {
                attemptId: attempt._id,
                mockTestId: test._id,
                title: test.title,
                type: "mock-test",
                durationMinutes: test.durationMinutes,
                totalQuestions: attempt.totalQuestions,
                startTime: attempt.startTime,
                questions: safeQuestions,
            },
        });
    } catch (error) {
        console.error("startMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to start mock test",
        });
    }
};

export const submitAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const { answers = {} } = req.body;

        const attempt = await Attempt.findById(attemptId);
        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        // Ownership isolation
        if (attempt.student.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not own this attempt.",
            });
        }

        // Prevent resubmission of expired or already submitted attempts
        if (attempt.isSubmitted || attempt.status === "completed" || attempt.status === "expired") {
            return res.status(409).json({
                success: false,
                message: attempt.status === "expired"
                    ? "This test attempt has expired and can no longer be submitted."
                    : "This test attempt has already been submitted.",
                data: {
                    attemptId: attempt._id,
                    status: attempt.status,
                    score: attempt.score,
                    totalMarks: attempt.totalMarks,
                    accuracy: attempt.accuracy,
                    result: attempt.result,
                },
            });
        }

        const now = new Date();
        const elapsedSec = Math.max(1, Math.round((now.getTime() - new Date(attempt.startTime).getTime()) / 1000));
        const maxAllowedSec = attempt.durationMinutes * 60 + 120; // Duration plus 2-minute network grace period

        // Server-enforced test expiration
        if (elapsedSec > maxAllowedSec) {
            const expiredAttempt = await Attempt.findOneAndUpdate(
                { _id: attemptId, isSubmitted: false, status: "in-progress" },
                {
                    $set: {
                        status: "expired",
                        result: "Failed",
                        isSubmitted: true,
                        score: 0,
                        accuracy: 0,
                        endTime: now,
                        timeSpentSeconds: maxAllowedSec,
                    },
                },
                { returnDocument: "after" }
            );

            if (!expiredAttempt) {
                const existing = await Attempt.findById(attemptId);
                return res.status(409).json({
                    success: false,
                    message: "This test attempt has already been submitted.",
                    data: {
                        attemptId: existing._id,
                        status: existing.status,
                        score: existing.score,
                    },
                });
            }

            return res.status(400).json({
                success: false,
                message: "Test duration has expired. Late submissions cannot be accepted.",
                data: {
                    attemptId: expiredAttempt._id,
                    status: "expired",
                    score: 0,
                    totalMarks: expiredAttempt.totalMarks,
                    accuracy: 0,
                    result: "Failed",
                    timeSpentSeconds: maxAllowedSec,
                    submittedAt: now,
                },
            });
        }

        // Format answers dictionary: accepts either { [questionId]: "A" } or array of [{ questionId, answer }]
        const answerMap = {};
        if (Array.isArray(answers)) {
            answers.forEach((item) => {
                if (item?.questionId) answerMap[item.questionId] = item.answer || item.userAnswer;
            });
        } else if (typeof answers === "object" && answers !== null) {
            Object.assign(answerMap, answers);
        }

        let correctCount = 0;
        let answeredCount = 0;

        attempt.questions.forEach((q) => {
            const userChoice = answerMap[q.questionId] || answerMap[q.questionRef?.toString()] || null;
            q.userAnswer = userChoice;

            if (userChoice) {
                answeredCount += 1;
                if (userChoice.toUpperCase() === q.correctOption.toUpperCase()) {
                    q.isCorrect = true;
                    correctCount += 1;
                } else {
                    q.isCorrect = false;
                }
            } else {
                q.isCorrect = false;
            }
        });

        const totalQ = attempt.questions.length || 1;
        const accuracy = Math.round((correctCount / totalQ) * 100);
        const score = correctCount;
        const passingPct = 60;
        const resultStatus = accuracy >= passingPct ? "Passed" : "Needs Review";

        // Concurrency-safe atomic transition
        const submittedAttempt = await Attempt.findOneAndUpdate(
            { _id: attemptId, isSubmitted: false, status: "in-progress" },
            {
                $set: {
                    questions: attempt.questions,
                    score,
                    totalMarks: totalQ,
                    accuracy,
                    result: resultStatus,
                    status: "completed",
                    isSubmitted: true,
                    endTime: now,
                    timeSpentSeconds: elapsedSec,
                },
            },
            { returnDocument: "after" }
        );

        if (!submittedAttempt) {
            const existing = await Attempt.findById(attemptId);
            return res.status(409).json({
                success: false,
                message: existing.status === "expired"
                    ? "This test attempt has expired and can no longer be submitted."
                    : "This test attempt has already been submitted.",
                data: {
                    attemptId: existing._id,
                    status: existing.status,
                    score: existing.score,
                },
            });
        }

        // Increment mock test stats if mock test
        if (submittedAttempt.mockTest) {
            await MockTest.findByIdAndUpdate(submittedAttempt.mockTest, {
                $inc: { attemptsCount: 1 },
            }).catch(() => null);
        }

        return res.json({
            success: true,
            message: "Test submitted and scored successfully",
            data: {
                attemptId: submittedAttempt._id,
                title: submittedAttempt.title,
                type: submittedAttempt.type,
                status: submittedAttempt.status,
                score: submittedAttempt.score,
                totalMarks: submittedAttempt.totalMarks,
                accuracy: submittedAttempt.accuracy,
                correctCount,
                wrongCount: answeredCount - correctCount,
                unansweredCount: totalQ - answeredCount,
                timeSpentSeconds: submittedAttempt.timeSpentSeconds,
                result: submittedAttempt.result,
                submittedAt: submittedAttempt.endTime,
            },
        });
    } catch (error) {
        console.error("submitAttempt error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to submit attempt",
        });
    }
};

export const getAttemptReview = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const attempt = await Attempt.findById(attemptId);

        if (!attempt) {
            return res.status(404).json({
                success: false,
                message: "Test attempt not found",
            });
        }

        const isOwner = attempt.student.toString() === req.user._id.toString();
        const isPrivileged = ["coordinator", "admin"].includes(req.user.role);

        if (!isOwner && !isPrivileged) {
            return res.status(403).json({
                success: false,
                message: "Unauthorized: You cannot access review for another student's test.",
            });
        }

        return res.json({
            success: true,
            message: "Review retrieved successfully",
            data: {
                attemptId: attempt._id,
                title: attempt.title,
                type: attempt.type,
                score: attempt.score,
                totalMarks: attempt.totalMarks,
                accuracy: attempt.accuracy,
                result: attempt.result,
                timeSpentSeconds: attempt.timeSpentSeconds,
                durationMinutes: attempt.durationMinutes,
                createdAt: attempt.createdAt,
                questions: attempt.questions,
            },
        });
    } catch (error) {
        console.error("getAttemptReview error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve attempt review",
        });
    }
};

export const getHistory = async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const filter = {
            student: req.user._id,
            isSubmitted: true,
        };

        if (type) filter.type = type;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
        const skip = (pageNum - 1) * limitNum;

        const [attempts, total] = await Promise.all([
            Attempt.find(filter)
                .select("-questions")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Attempt.countDocuments(filter),
        ]);

        return res.json({
            success: true,
            message: "History retrieved successfully",
            data: attempts,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("getHistory error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve test history",
        });
    }
};

export const getIncorrectQuestions = async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const maxLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

        // Aggregate across student's attempts to find questions where userAnswer is not correctOption
        const attempts = await Attempt.find({
            student: req.user._id,
            isSubmitted: true,
        }).sort({ createdAt: -1 });

        const seenQuestionIds = new Set();
        const incorrectList = [];

        for (const att of attempts) {
            for (const q of att.questions) {
                if (q.userAnswer && !q.isCorrect && !seenQuestionIds.has(q.questionId)) {
                    seenQuestionIds.add(q.questionId);
                    incorrectList.push({
                        _id: q.questionRef || q.questionId,
                        questionId: q.questionId,
                        questionText: q.questionText,
                        options: q.options,
                        correctOption: q.correctOption,
                        explanation: q.explanation,
                        category: q.category,
                        topic: q.topic,
                        difficulty: q.difficulty,
                        attemptedAnswer: q.userAnswer,
                        lastAttemptedDate: att.createdAt,
                    });

                    if (incorrectList.length >= maxLimit) break;
                }
            }
            if (incorrectList.length >= maxLimit) break;
        }

        return res.json({
            success: true,
            message: "Incorrect questions retrieved successfully",
            data: incorrectList,
        });
    } catch (error) {
        console.error("getIncorrectQuestions error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve incorrect questions",
        });
    }
};

export const createMockTest = async (req, res) => {
    try {
        const {
            title,
            slug,
            type = "grand",
            description,
            company,
            durationMinutes = 60,
            totalQuestions = 30,
            passingScore = 60,
            category = "Mixed",
            difficulty = "medium",
            questions = [],
        } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                message: "Mock test title is required",
            });
        }

        const generatedSlug =
            slug ||
            title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

        const existing = await MockTest.findOne({ slug: generatedSlug });
        if (existing) {
            return res.status(409).json({
                success: false,
                message: `Mock test with slug '${generatedSlug}' already exists`,
            });
        }

        const newTest = await MockTest.create({
            title: title.trim(),
            slug: generatedSlug,
            type,
            description: description || "",
            company: company || "",
            durationMinutes: Number(durationMinutes),
            totalQuestions: Number(totalQuestions),
            passingScore: Number(passingScore),
            category,
            difficulty,
            questions,
            isActive: true,
        });

        await logAuditEvent({
            action: "MOCK_TEST_CREATE",
            user: req.user,
            targetType: "TEST",
            targetId: newTest._id,
            details: `Created mock test: ${newTest.title}`,
            ipAddress: req.ip,
        });

        return res.status(201).json({
            success: true,
            message: "Mock test created successfully",
            data: newTest,
        });
    } catch (error) {
        console.error("createMockTest error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to create mock test",
        });
    }
};
