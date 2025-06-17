// import express from "express";
// import cors from "cors";
// import dotenv from "dotenv";
// import mongoose from "mongoose";
// import morgan from "morgan";

// // Routes
// import authRoutes from "./routes/auth.js";
// import expenseRoutes from "./routes/expenses.js";
// import billRoutes from "./routes/bills.js";
// import warrantyRoutes from "./routes/warranties.js";

// // Middleware
// import { authenticateToken } from "./middleware/auth.js";
// import { errorHandler } from "./middleware/errorHandler.js";

// // Load environment variables
// dotenv.config({ path: "./../.env" });

// const app = express();

// // Basic configuration
// const PORT = process.env.PORT || 5000;
// const MONGODB_URI = process.env.MONGODB_URI;
// const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

// // Check required environment variables
// if (!MONGODB_URI) {
//   console.error("MONGODB_URI is required");
//   process.exit(1);
// }

// if (!process.env.JWT_SECRET) {
//   console.error("JWT_SECRET is required");
//   process.exit(1);
// }

// // Middleware
// app.use(morgan("combined"));
// app.use(cors({ origin: CORS_ORIGIN }));
// app.use(express.json());
// app.use("/uploads", express.static("uploads"));

// // Database Connection
// const connectDB = async () => {
//   try {
//     await mongoose.connect(MONGODB_URI);
//     console.log("MongoDB Connected");
//   } catch (error) {
//     console.error("MongoDB Connection Error:", error);
//     process.exit(1);
//   }
// };

// connectDB();

// // Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/expenses", authenticateToken, expenseRoutes);
// app.use("/api/bills", authenticateToken, billRoutes);
// app.use("/api/warranties", authenticateToken, warrantyRoutes);

// // Default route
// app.get("/", (req, res) => {
//   res.send("API is running...");
// });

// // Error handling middleware
// app.use(errorHandler);

// // Start server
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://smart-spend-eta.vercel.app"]
        : ["http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Database connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Import routes (ensure these files also use ES modules)
import authRoutes from "./routes/auth.js";
import billsRoutes from "./routes/bills.js";
import expensesRoutes from "./routes/expenses.js";
import warrantiesRoutes from "./routes/warranties.js";

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/bills", billsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/api/warranties", warrantiesRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for Vercel (ES module syntax)
export default app;
