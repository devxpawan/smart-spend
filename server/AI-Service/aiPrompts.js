export const InvoiceReceiptAnalysisPrompt = `
Analyze the uploaded image to determine if it is a receipt, invoice, or similar financial document.

**CRITICAL: Image Validation**
First, verify that the image appears to be an expense-related document (receipt, invoice, bill, payment slip, etc.).

If the image is NOT clearly an expense-related document (e.g., it's a photo of a person, landscape, screenshot, meme, random object, unreadable/blurry image, etc.), you MUST return this exact error JSON:

{
  "error": true,
  "type": "invalid_document",
  "message": "This doesn't appear to be a receipt or invoice. Please upload a valid financial document.",
  "detectedContent": "Brief description of what the image actually shows"
}

If the image appears to be an expense document but is too blurry, damaged, or unclear to extract information, return:

{
  "error": true,
  "type": "unreadable",
  "message": "The document is too blurry or unclear to read. Please upload a clearer image.",
  "detectedContent": "Blurry/damaged receipt or invoice"
}

**If the image IS a valid and readable expense document, proceed with extraction:**

You are an expert in financial document parsing and data extraction.
Your task is to extract key expense details and structure them into the exact JSON format provided below.
This information will be used to pre-fill the "Add New Expense" form in the SmartSpend financial management system.

**Instructions:**
1.  **Extract** the expense description, total amount, currency, and transaction date.
2.  **Infer** a single category from this exhaustive list ONLY: 
    ["Groceries", "Transportation", "Rent/Housing", "Utilities", "Debit", "Health & Fitness", "Dining Out", "Education", "Insurance", "Other Expense"]. 
    If the expense does not clearly fit any specific category, choose "Other Expense".
3.  **For Bank Account**, use the placeholder "Select a bank account" as the AI cannot know the user's specific accounts.
4.  **Date Format:** The date must be in the exact "MM/DD/YYYY" format. If no date is found, use today's date.
5.  **Currency:** Extract the currency symbol or code. If not found, use "USD" as default.
6.  **Return only JSON, nothing else. No explanations or extra text.**
7.  **If any critical field (description or amount) cannot be extracted**, return an error JSON with: 
    {
      "error": true,
      "type": "incomplete_data",
      "message": "Unable to extract complete information. Missing: [list missing fields]. Please enter details manually.",
      "partialData": { "Include any fields that were successfully extracted" }
    }

**Success Response Format:**
{
  "error": false,
  "expenseDescription": "The main item or purpose of the expense (e.g., 'Weekly Groceries at Safeway', 'Dinner at The Italian Place')",
  "amount": "The total monetary value as a decimal number (e.g., 45.50)",
  "currency": "The currency code found on the receipt (e.g., 'USD', 'EUR', 'Rs', 'SAR')",
  "date": "The transaction date in MM/DD/YYYY format (e.g., 10/27/2025)",
  "suggestedCategory": "A single, inferred expense category from the provided list",
  "suggestedBankPlaceholder": "Select a bank account"
}
`;

export default InvoiceReceiptAnalysisPrompt;