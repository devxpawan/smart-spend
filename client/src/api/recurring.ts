import axios from "axios";
import RecurringInterface from "../types/RecurringInterface";

const API_BASE_URL = "/api/recurring";

// Get all recurring transactions
export const getRecurringTransactions = async (): Promise<{
  expenses: RecurringInterface[];
  incomes: RecurringInterface[];
}> => {
  try {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching recurring transactions:", error);
    
    // Handle different types of errors
    if (axios.isAxiosError(error)) {
      if (error.response) {
        // Server responded with error status
        const errorMessage = error.response.data?.message || "Server error occurred";
        throw new Error(`Server Error: ${errorMessage}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error("Network error - unable to reach server");
      } else {
        // Something else happened
        throw new Error(`Request error: ${error.message}`);
      }
    } else {
      // Non-Axios error
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch recurring transactions");
    }
  }
};

// Update a recurring transaction
export const updateRecurringTransaction = async (
  id: string,
  type: "expense" | "income",
  data: Partial<RecurringInterface>
): Promise<RecurringInterface> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}?type=${type}`, data);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error updating recurring transaction:", error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorMessage = error.response.data?.message || "Server error occurred";
        throw new Error(`Server Error: ${errorMessage}`);
      } else if (error.request) {
        throw new Error("Network error - unable to reach server");
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    } else {
      throw new Error((error instanceof Error) ? error.message : "Failed to update recurring transaction");
    }
  }
};

// Delete a recurring transaction (removes recurring flags)
export const deleteRecurringTransaction = async (
  id: string,
  type: "expense" | "income"
): Promise<RecurringInterface> => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${id}?type=${type}`);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error deleting recurring transaction:", error);
    
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const errorMessage = error.response.data?.message || "Server error occurred";
        throw new Error(`Server Error: ${errorMessage}`);
      } else if (error.request) {
        throw new Error("Network error - unable to reach server");
      } else {
        throw new Error(`Request error: ${error.message}`);
      }
    } else {
      throw new Error((error instanceof Error) ? error.message : "Failed to remove recurring transaction");
    }
  }
};