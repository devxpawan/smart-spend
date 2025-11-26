import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";
import http from "http";
import { Server } from "socket.io";

// Routes
import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import billRoutes from "./routes/bills.js";
import warrantyRoutes from "./routes/warranties.js";
import incomeRoutes from "./routes/incomes.js";
import financialHealthRoutes from "./routes/financialHealth.js";
import userRoutes from "./routes/user.js";
import bankAccountRoutes from "./routes/bankAccounts.js";
import recurringRoutes from "./routes/recurring.js";
import notificationRoutes from "./routes/notifications.js"; // Add notifications route
import goalRoutes from "./routes/goals.js"; // Add goals route
import monthlyContributionRoutes from "./routes/monthlyContributions.js"; // Add this line
import GPTRouter from "./AI-Service/Gemini-Route.js"; //gemini route

// Middleware
import { authenticateToken } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Jobs
import recurringJob from "./jobs/recurringJob.js"; // Import the recurring job
import expenseWarningJob from "./jobs/expenseWarningJob.js"; // Import the expense warning job
import monthlyContributionJob from "./jobs/monthlyContributionJob.js"; // Add this line
import goalExpirationJob from "./jobs/goalExpirationJob.js"; // Add this line

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now
  },
});

// Basic configuration
const PORT = process.env.PORT || 50502; // Use fixed port 50502 for development
const MONGODB_URI = process.env.MONGODB_URI;
// CORS configuration
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "https://smart-spend-frontend-rosy.vercel.app",
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
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());


// CSP middleware
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://apis.google.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://res.cloudinary.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://accounts.google.com;"
  );
  next();
});

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
  console.log("Registering user routes at /api/user");
  app.use("/api/users", authenticateToken, userRoutes);
  app.use("/api/bank-accounts", authenticateToken, bankAccountRoutes);
  app.use("/api/recurring", authenticateToken, recurringRoutes);
  app.use("/api/notifications", authenticateToken, notificationRoutes); // Add notifications route
  app.use("/api/goals", authenticateToken, goalRoutes); // Add goals route
  app.use("/api/monthly-contributions", authenticateToken, monthlyContributionRoutes); // Add this line
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
  });
}

export { io };

export default app;