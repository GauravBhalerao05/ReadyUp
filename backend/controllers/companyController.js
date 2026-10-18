import Company from "../models/Company.js";
import Question from "../models/Question.js";

export const getCompanies = async (req, res) => {
    try {
        const companies = await Company.find().sort({ name: 1 });

        const enriched = await Promise.all(
            companies.map(async (comp) => {
                const cObj = comp.toObject();
                const qCount = await Question.countDocuments({
                    companies: new RegExp(comp.name, "i"),
                    isActive: true,
                });
                cObj.questionCount = qCount;
                return cObj;
            })
        );

        return res.json({
            success: true,
            message: "Companies retrieved successfully",
            data: enriched,
        });
    } catch (error) {
        console.error("getCompanies error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve companies",
        });
    }
};

export const getCompanyBySlug = async (req, res) => {
    try {
        const { slug } = req.params;
        const company = await Company.findOne({ slug });

        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }

        const compObj = company.toObject();
        const questions = await Question.find({
            companies: new RegExp(company.name, "i"),
            isActive: true,
        }).select("-correctOption -explanation");

        compObj.questionCount = questions.length;
        compObj.sampleQuestions = questions.slice(0, 5);

        return res.json({
            success: true,
            message: "Company details retrieved successfully",
            data: compObj,
        });
    } catch (error) {
        console.error("getCompanyBySlug error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve company details",
        });
    }
};
