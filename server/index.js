import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import http from "http";
import mongoose from "mongoose";
import morgan from "morgan";
import { Server } from "socket.io";
import helmet from "helmet";

// Routes
import GPTRouter from "./AI-Service/Gemini-Route.js"; //gemini route
import achievementRoutes from "./routes/achievements.js";
import authRoutes from "./routes/auth.js";
import bankAccountRoutes from "./routes/bankAccounts.js";
import billRoutes from "./routes/bills.js";
import expenseRoutes from "./routes/expenses.js";
import financialHealthRoutes from "./routes/financialHealth.js";
import goalRoutes from "./routes/goals.js";
import incomeRoutes from "./routes/incomes.js";
import notificationRoutes from "./routes/notifications.js"; // Add notifications route
import recurringRoutes from "./routes/recurring.js";
import userRoutes from "./routes/user.js";
import warrantyRoutes from "./routes/warranties.js";

// Middleware
import { authenticateToken } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Jobs
import billReminderJob from "./jobs/billReminderJob.js"; // Bill reminder job
import {
  dailyContributionJob,
  monthlyContributionJob,
  weeklyContributionJob,
} from "./jobs/contributionJobs.js"; // Add contribution jobs
import expenseWarningJob from "./jobs/expenseWarningJob.js"; // Import the expense warning job
import goalExpirationJob from "./jobs/goalExpirationJob.js"; // Add this line
import recurringJob from "./jobs/recurringJob.js"; // Import the recurring job

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // Align Socket.IO CORS with API CORS policy
    origin: process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(",").map((o) => o.trim())
      : [
          "https://smartspend.vercel.app",
          "http://localhost:5173",
          "http://localhost:3000",
        ],
    credentials: true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
});

// Attach security headers (including CSP) to Socket.IO handshake/upgrade responses
io.engine.on("headers", (headers, req) => {
  const csp = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' https://apis.google.com https://accounts.google.com",
    "style-src 'self' https://fonts.googleapis.com",
    "img-src 'self' data: https://res.cloudinary.com https://i.postimg.cc",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  headers["Content-Security-Policy"] = csp;
  headers["Referrer-Policy"] = "no-referrer";
  headers["Permissions-Policy"] =
    "geolocation=(), microphone=(), camera=(), interest-cohort=()";
  headers["X-Content-Type-Options"] = "nosniff";
});

// Basic configuration
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "https://smartspend.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ];

// Check required environment variables
const requiredEnvVars = [
  { name: "MONGODB_URI", value: MONGODB_URI },
  { name: "JWT_SECRET", value: process.env.JWT_SECRET },
  {
    name: "CLOUDINARY_CLOUD_NAME",
    value: process.env.CLOUDINARY_CLOUD_NAME,
  },
  { name: "CLOUDINARY_API_KEY", value: process.env.CLOUDINARY_API_KEY },
  {
    name: "CLOUDINARY_API_SECRET",
    value: process.env.CLOUDINARY_API_SECRET,
  },
  { name: "GOOGLE_CLIENT_ID", value: process.env.GOOGLE_CLIENT_ID },
  { name: "GEMINI_KEY", value: process.env.GEMINI_KEY },
];

const missingEnvVars = requiredEnvVars.filter((envVar) => !envVar.value);

if (missingEnvVars.length > 0) {
  console.error("Missing required environment variables:");
  missingEnvVars.forEach((envVar) => {
    console.error(`- ${envVar.name}`);
  });
  console.error(
    "Please check your .env file and ensure all required variables are set."
  );
  process.exit(1);
}

// Middleware
app.use(morgan("combined"));
// Security headers via Helmet
app.use(
  helmet({
    // Disable default CSP, we will configure a tailored one next
    contentSecurityPolicy: false,
  })
);
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Strict-Transport-Security (HSTS) for HTTPS deployments
// Note: enable only when behind HTTPS (recommended in production)
if (process.env.ENABLE_HSTS === "true") {
  app.use(
    helmet.hsts({
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    })
  );
}

// X-Frame-Options / clickjacking protection
app.use(
  helmet.frameguard({
    action: "deny",
  })
);

// X-Content-Type-Options: nosniff
app.use(helmet.noSniff());

// Refined CSP (adjust sources to what the app actually needs)
// Avoid 'unsafe-inline' where possible. If inline styles/scripts are required,
// prefer nonces or hashes; keep minimal allowances for now.
app.use((req, res, next) => {
  const csp = [
    "default-src 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "script-src 'self' https://apis.google.com https://accounts.google.com",
    "style-src 'self' https://fonts.googleapis.com",
    "img-src 'self' data: https://res.cloudinary.com https://i.postimg.cc",
    "font-src 'self' https://fonts.gstatic.com",
    "connect-src 'self' https://accounts.google.com https://www.googleapis.com",
    "frame-src 'self' https://accounts.google.com",
    "frame-ancestors 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
  res.setHeader("Content-Security-Policy", csp);
  next();
});

// Additional hardening
app.disable("etag"); // avoid ETag-based cache/disclosure where not needed
app.disable("x-powered-by"); // remove Express signature (helmet also handles this)

// Referrer-Policy
app.use(
  helmet.referrerPolicy({
    policy: "no-referrer",
  })
);

// Permissions-Policy (adjust to actual usage)
app.use((req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), interest-cohort=()"
  );
  next();
});

// Cache-control: prevent sensitive API responses from being cached
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

// Removed duplicate CSP middleware to avoid conflicts and 'unsafe-inline'

// Database Connection
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use("/api/auth", authRoutes);
// Public warranty route (for QR code access) - must come before authenticated routes
app.use("/api/warranties/public", warrantyRoutes);
app.use("/api/expenses", authenticateToken, expenseRoutes);
app.use("/api/bills", authenticateToken, billRoutes);
app.use("/api/warranties", authenticateToken, warrantyRoutes);
app.use("/api/incomes", authenticateToken, incomeRoutes);
app.use("/api/financial-health", authenticateToken, financialHealthRoutes);
app.use("/api/goals", authenticateToken, goalRoutes);
app.use("/api/achievements", authenticateToken, achievementRoutes);
console.log("Registering user routes at /api/user");
app.use("/api/user", authenticateToken, userRoutes);
app.use("/api/bank-accounts", authenticateToken, bankAccountRoutes);
app.use("/api/recurring", authenticateToken, recurringRoutes);
app.use("/api/notifications", authenticateToken, notificationRoutes); // Add notifications route

app.use("/api/gemini", authenticateToken, GPTRouter); //gemini route

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use(errorHandler);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("a user connected");
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });
});

// Start server only when not in a Vercel environment
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    const actualPort = server.address().port;
    console.log(`Server running on port ${actualPort}`);

    // Start the recurring transaction processor job
    console.log("Starting recurring transaction processor job...");
    // Start scheduled jobs
    recurringJob.start();
    expenseWarningJob.start();
    goalExpirationJob.start(); // Start goal expiration job
    billReminderJob.start();

    // Start contribution jobs
    dailyContributionJob.start();
    weeklyContributionJob.start();
    monthlyContributionJob.start();
  });
}

export { io };

export default app;
