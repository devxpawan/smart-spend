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
        
        // 3. Call the vision model with correct structure
        const result = await visionModel.generateContent({
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
        });

        // 4. Parse the JSON response
        const response = await result.response;
        const jsonText = response.text();
        const expenseData = JSON.parse(jsonText);

        // 5. Respond with the structured data
        res.status(200).json(expenseData);

    } catch (error) {
        console.error("Error in /analyze-receipt:", error);
        res.status(500).json({
            error: "Failed to analyze receipt. Please ensure the image is clear.",
            rawError: error.message,
        });
    }
});

export default GPTRouter;