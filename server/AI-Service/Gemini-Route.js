import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import InvoiceReceiptAnalysisPrompt from "../AI-Service/aiPrompts.js";


dotenv.config();

const GPTRouter = express.Router();
const apiKey = process.env.GEMINI_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

// 💬 Text chat model
const model = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

// 🧠 Vision model (supports text + image input)
const visionModel = genAI.getGenerativeModel({
  model: "gemini-2.5-flash",
});

const sessions = new Map();

// Simple exponential backoff retry helper for transient provider errors
async function withRetry(fn, { tries = 3, baseMs = 500 } = {}) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.status;
      const retriable = status === 503 || status === 429;
      if (!retriable || i === tries - 1) break;
      const delay = baseMs * Math.pow(2, i) + Math.random() * 100;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// 🔹 Middleware for handling image uploads (with size limit)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Helper function to convert a buffer to a GoogleGenerativeAI.Part object
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType,
    },
  };
}


// ======================================================
// 🧾 Receipt Analysis Endpoint (SmartSpend)
// ======================================================
GPTRouter.post("/analyze-receipt", upload.single("receiptImage"), async (req, res) => {
    // 1. Check for file
    if (!req.file) {
        return res.status(400).json({ error: "No receipt image uploaded." });
    }

    const mimeType = req.file.mimetype;

    try {
        // 2. Prepare the image part and the text prompt
        const imagePart = bufferToGenerativePart(req.file.buffer, mimeType);
        
        // 3. Call the vision model with retry for transient overload/ratelimit
        const result = await withRetry(() => visionModel.generateContent({
          contents: [
            {
              role: "user",
              parts: [
                imagePart,
                { text: InvoiceReceiptAnalysisPrompt }
              ]
            }
          ],
          generationConfig: {
            responseMimeType: "application/json",
          }
        }));

        // 4. Parse the JSON response
        const response = await result.response;
        const jsonText = response.text();
        const expenseData = JSON.parse(jsonText);

        // 5. Respond with the structured data
        res.status(200).json(expenseData);

    } catch (error) {
      console.error("Error in /analyze-receipt:", error);
      const status = error?.status === 503 || error?.status === 429 ? error.status : 500;
      const message =
        status === 503
        ? "AI service is temporarily overloaded. Please try again shortly."
        : status === 429
        ? "Rate limit reached. Please wait and retry."
        : "Failed to analyze receipt. Please ensure the image is clear.";
      res.status(status).json({
        error: message,
        code: status,
        statusText: error?.statusText,
        rawError: error?.message,
      });
    }
});

export default GPTRouter;