import axios from "axios";
import GoalInterface, { GoalFormData } from "../types/GoalInterface";

const API_BASE_URL = "/api/goals";

// Get all goals for the user
export const getGoals = async (): Promise<GoalInterface[]> => {
  try {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching goals:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch goals");
    }
  }
};

// Get a specific goal by ID
export const getGoalById = async (id: string): Promise<GoalInterface> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${id}`);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching goal:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch goal");
    }
  }
};

// Create a new goal
export const createGoal = async (data: GoalFormData): Promise<GoalInterface> => {
  try {
    const response = await axios.post(API_BASE_URL, data);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error creating goal:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to create goal");
    }
  }
};

// Update a goal
export const updateGoal = async (
  id: string,
  data: Partial<GoalFormData>
): Promise<GoalInterface> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}`, data);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error updating goal:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to update goal");
    }
  }
};

// Delete a goal
export const deleteGoal = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_BASE_URL}/${id}`);
  } catch (error: unknown) {
    console.error("API Error deleting goal:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to delete goal");
    }
  }
};

// Add a contribution to a goal
export const addContribution = async (
  goalId: string,
  amount: number,
  description?: string,
  bankAccountId?: string
): Promise<GoalInterface> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/${goalId}/contributions`, {
      amount,
      description,
      bankAccountId
    });
    return response.data;
  } catch (error: unknown) {
    console.error("API Error adding contribution:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to add contribution");
    }
  }
};