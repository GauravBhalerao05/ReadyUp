import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { logAuditEvent } from "../utils/auditLogger.js";

const createToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    return jwt.sign(
        { sub: user._id.toString(), role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

export const register = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            department,
            college,
            graduationYear,
            studentId,
        } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string" ||
            !name.trim() ||
            !email.trim() ||
            password.length < 8
        ) {
            return res.status(400).json({
                success: false,
                message: "Name, valid email, and password of at least 8 characters are required.",
                errors: [
                    {
                        field: "password",
                        message: "Password must be at least 8 characters long",
                    },
                ],
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "An account with this email address already exists.",
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        // Security rule: public registration CANNOT select coordinator or admin
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: "student",
            department: department ? department.trim() : "Computer Science & Engineering",
            college: college ? college.trim() : "National Institute of Technology",
            graduationYear: graduationYear ? Number(graduationYear) : 2026,
            studentId: studentId ? studentId.trim() : `STU-${Date.now().toString().slice(-4)}`,
            isActive: true,
            lastLoginAt: new Date(),
        });

        const token = createToken(user);

        const safeUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            college: user.college,
            graduationYear: user.graduationYear,
            studentId: user.studentId,
            isActive: user.isActive,
            createdAt: user.createdAt,
        };

        await logAuditEvent({
            action: "USER_REGISTER",
            user: safeUser,
            targetType: "AUTH",
            targetId: user._id,
            details: `New student registration: ${user.email}`,
            ipAddress: req.ip,
        });

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            data: {
                user: safeUser,
                token,
            },
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Email already registered.",
            });
        }

        console.error("Registration error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to complete registration. Please try again later.",
        });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required.",
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({
            email: normalizedEmail,
        }).select("+password");

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password.",
            });
        }

        if (user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "This account has been deactivated. Please contact an administrator.",
            });
        }

        user.lastLoginAt = new Date();
        await user.save();

        const token = createToken(user);

        const safeUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            college: user.college,
            graduationYear: user.graduationYear,
            studentId: user.studentId,
            isActive: user.isActive,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
        };

        await logAuditEvent({
            action: "USER_LOGIN",
            user: safeUser,
            targetType: "AUTH",
            targetId: user._id,
            details: `Successful ${user.role} login`,
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: "Logged in successfully",
            data: {
                user: safeUser,
                token,
            },
        });
    } catch (error) {
        console.error("Login error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to log in right now.",
        });
    }
};

export const logout = async (req, res) => {
    return res.json({
        success: true,
        message: "Logged out successfully",
        data: null,
    });
};

export const getMe = async (req, res) => {
    return res.json({
        success: true,
        message: "User retrieved",
        data: req.user,
    });
};

export const updateProfile = async (req, res) => {
    try {
        const { name, department, college, graduationYear, studentId } = req.body;

        const updateFields = {};
        if (name && typeof name === "string") updateFields.name = name.trim();
        if (department !== undefined) updateFields.department = String(department).trim();
        if (college !== undefined) updateFields.college = String(college).trim();
        if (graduationYear !== undefined) updateFields.graduationYear = Number(graduationYear);
        if (studentId !== undefined) updateFields.studentId = String(studentId).trim();

        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateFields },
            { new: true, runValidators: true }
        ).select("_id name email role department college graduationYear studentId isActive");

        return res.json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser,
        });
    } catch (error) {
        console.error("Profile update error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to update profile.",
        });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword || newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Current password and a new password with at least 8 characters are required.",
            });
        }

        const user = await User.findById(req.user._id).select("+password");
        if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
            return res.status(400).json({
                success: false,
                message: "Incorrect current password.",
            });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        await logAuditEvent({
            action: "PASSWORD_CHANGE",
            user: req.user,
            targetType: "AUTH",
            targetId: user._id,
            details: "User changed their password",
            ipAddress: req.ip,
        });

        return res.json({
            success: true,
            message: "Password changed successfully",
            data: null,
        });
    } catch (error) {
        console.error("Change password error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Unable to change password.",
        });
    }
};
