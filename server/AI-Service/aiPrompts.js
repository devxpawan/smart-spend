// --- Note: This content should replace the definition of InvoiceReceiptAnalysisPrompt 
// in your existing '../AI-Service/aiPrompts.js' file. ---

export const InvoiceReceiptAnalysisPrompt = `
Analyze the uploaded image, which is a receipt, invoice, or similar financial document.
Your task is to extract key expense details and structure them into the exact JSON format provided below.
This information will be used to pre-fill the "Add New Expense" form in the SmartSpend financial management system.
You are an expert in financial document parsing and data extraction.

**Instructions:**
1.  **Extract** the expense description, total amount, currency, and transaction date.
2.  **Infer** a single category from this exhaustive list ONLY: 
    ["Groceries", "Transportation", "Rent/Housing", "Utilities", "Debit", "Health & Fitness", "Dining Out", "Education", "Insurance", "Other Expense"]. 
    If the expense does not clearly fit any specific category, choose "Other Expense".
3.  **For Bank Account**, use a placeholder as the AI cannot know the user's specific accounts.
4.  **Date Format:** The date must be in the exact "MM/DD/YYYY" format.
5.  **Return only JSON, nothing else. No explanations or extra text.**

{
  "expenseDescription": "The main item or purpose of the expense (e.g., 'Weekly Groceries at Safeway', 'Dinner at The Italian Place')",
  "amount": "The total monetary value of the transaction as a decimal number (e.g., 45.50)",
  "currency": "The currency code found on the receipt (e.g., 'USD', 'EUR', 'Rs', 'SAR')",
  "date": "The transaction date in MM/DD/YYYY format (e.g., 10/27/2025)",
  "suggestedCategory": "A single, inferred expense category. MUST be one of the following: Groceries, Transportation, Rent/Housing, Utilities, Debit, Health & Fitness, Dining Out, Education, Insurance, or Other Expense.",
  "suggestedBankPlaceholder": "Select a bank account"
}
`;


export default InvoiceReceiptAnalysisPrompt;