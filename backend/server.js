import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import connectDB from "./config/db.js";

// Routes
import authRoutes from "./routes/authRoutes.js";
import questionRoutes from "./routes/questionRoutes.js";
import companyRoutes from "./routes/companyRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";
import coordinatorRoutes from "./routes/coordinatorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

dotenv.config();

const app = express();

// Security headers
app.use(
    helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
    })
);

// Dynamic CORS configuration
const allowedOrigins = process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (such as mobile apps, Postman, curl, or server-to-server)
            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
                callback(null, true);
            } else {
                callback(null, true); // Permissive for local college development
            }
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// System Health Checks
app.get("/", (req, res) => {
    res.send("ReadyUp backend is running!");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        service: "ReadyUp Aptitude Backend API",
        timestamp: new Date().toISOString(),
    });
});

app.get("/api/v1/health", (req, res) => {
    res.json({
        status: "healthy",
        service: "ReadyUp Aptitude Backend API",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
    });
});

// Main API V1 Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/questions", questionRoutes);
app.use("/api/v1/companies", companyRoutes);
app.use("/api/v1/tests", testRoutes);
app.use("/api/v1/bookmarks", bookmarkRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/coordinator", coordinatorRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 Route Handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Endpoint ${req.method} ${req.originalUrl} not found on this server.`,
    });
});

// Centralized Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Server Error:", err.message);
    const status = err.status || 500;
    res.status(status).json({
        success: false,
        message: err.message || "Internal server error occurred.",
        errors: err.errors || [],
    });
});

const startServer = async () => {
    await connectDB();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
        console.log(`ReadyUp server running on port ${PORT}`);
    });
};

// Start server when run directly
if (process.env.NODE_ENV !== "test") {
    startServer();
}

export default app;
