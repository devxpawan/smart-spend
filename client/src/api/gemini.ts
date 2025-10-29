import api from "./api";

// Define proper types for different response scenarios
interface BaseResponse {
    error: boolean;
}

interface SuccessResponse extends BaseResponse {
    error: false;
    expenseDescription: string;
    amount: string;
    currency: string;
    date: string;
    suggestedCategory: string;
    suggestedBankPlaceholder: string;
}

interface ErrorResponse extends BaseResponse {
    error: true;
    type: 'invalid_document' | 'unreadable' | 'incomplete_data' | 'network_error' | 'unknown';
    message: string;
    detectedContent?: string;
    partialData?: Partial<{
        expenseDescription: string;
        amount: string;
        currency: string;
        date: string;
        suggestedCategory: string;
    }>;
}

// Union type for all possible responses
export type ReceiptAnalysisResponse = SuccessResponse | ErrorResponse;

// Type guard to check if response is an error
export const isErrorResponse = (response: ReceiptAnalysisResponse): response is ErrorResponse => {
    return response.error === true;
};

// Type guard to check if response is successful
export const isSuccessResponse = (response: ReceiptAnalysisResponse): response is SuccessResponse => {
    return response.error === false;
};

export const analyzeReceipt = async (receiptImage: File): Promise<ReceiptAnalysisResponse> => {
    try {
        // Validate file before sending
        if (!receiptImage) {
            return {
                error: true,
                type: 'invalid_document',
                message: 'No image file provided',
            };
        }

        // Validate file type
        if (!receiptImage.type.startsWith('image/')) {
            return {
                error: true,
                type: 'invalid_document',
                message: 'Please upload a valid image file (JPG, PNG, etc.)',
            };
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (receiptImage.size > maxSize) {
            return {
                error: true,
                type: 'invalid_document',
                message: 'File size must be less than 10MB. Please compress your image.',
            };
        }

        const formData = new FormData();
        formData.append("receiptImage", receiptImage);

        const response = await api.post<ReceiptAnalysisResponse>(
            "/gemini/analyze-receipt",
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
                timeout: 30000, // 30 second timeout
            }
        );

        // Validate response structure
        if (!response.data) {
            return {
                error: true,
                type: 'unknown',
                message: 'Invalid response from server',
            };
        }

        // If the AI returned an error response, return it as-is
        if (response.data.error === true) {
            return response.data as ErrorResponse;
        }

        // Validate success response has required fields
        const successData = response.data as SuccessResponse;
        if (!successData.expenseDescription || !successData.amount) {
            return {
                error: true,
                type: 'incomplete_data',
                message: 'Unable to extract complete information from the receipt',
                partialData: {
                    expenseDescription: successData.expenseDescription,
                    amount: successData.amount,
                    currency: successData.currency,
                    date: successData.date,
                    suggestedCategory: successData.suggestedCategory,
                },
            };
        }

        return successData;

    } catch (error: any) {
        console.error("Error analyzing receipt:", error);

        // Handle different error types
        if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            return {
                error: true,
                type: 'network_error',
                message: 'Request timed out. Please try again with a smaller or clearer image.',
            };
        }

        if (error.response) {
            // Server responded with error
            const status = error.response.status;
            const serverMessage = error.response.data?.message || error.response.data?.error;

            if (status === 400) {
                return {
                    error: true,
                    type: 'invalid_document',
                    message: serverMessage || 'Invalid request. Please check your image and try again.',
                };
            }

            if (status === 413) {
                return {
                    error: true,
                    type: 'invalid_document',
                    message: 'File size too large. Please upload a smaller image.',
                };
            }

            if (status === 429) {
                return {
                    error: true,
                    type: 'network_error',
                    message: 'Too many requests. Please wait a moment and try again.',
                };
            }

            if (status >= 500) {
                return {
                    error: true,
                    type: 'network_error',
                    message: 'Server error. Please try again later.',
                };
            }

            return {
                error: true,
                type: 'network_error',
                message: serverMessage || 'Failed to analyze receipt. Please try again.',
            };
        }

        if (error.request) {
            // Request made but no response received
            return {
                error: true,
                type: 'network_error',
                message: 'No response from server. Please check your internet connection.',
            };
        }

        // Something else happened
        return {
            error: true,
            type: 'unknown',
            message: error.message || 'An unexpected error occurred. Please try again.',
        };
    }
};