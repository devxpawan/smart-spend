import api from "./api";

interface ReceiptAnalysisResponse {
    expenseDescription: string;
    amount: string;
    currency: string;
    date: string;
    suggestedCategory: string;
    suggestedBankPlaceholder: string;
}

export const analyzeReceipt = async (receiptImage: File): Promise<ReceiptAnalysisResponse> => {
    try {
        const formData = new FormData();
        formData.append("receiptImage", receiptImage);

        const response = await api.post<ReceiptAnalysisResponse>(
            "/gemini/analyze-receipt",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );

        return response.data;
    } catch (error: any) {
        console.error("Error analyzing receipt:", error);
        throw new Error(
            error.response?.data?.error || "Failed to analyze receipt"
        );
    }
};