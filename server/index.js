import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import morgan from "morgan";

// Routes
import authRoutes from "./routes/auth.js";
import expenseRoutes from "./routes/expenses.js";
import billRoutes from "./routes/bills.js";
import warrantyRoutes from "./routes/warranties.js";

// Middleware
import { authenticateToken } from "./middleware/auth.js";
import { errorHandler } from "./middleware/errorHandler.js";

// Load environment variables
dotenv.config();

const app = express();

// Basic configuration
const PORT = process.env.PORT || 5000;
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
app.use("/uploads", express.static("uploads"));

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

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
