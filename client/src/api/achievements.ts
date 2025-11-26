import axios from "axios";

const API_BASE_URL = "/api/achievements";

export interface AchievementInterface {
  _id: string;
  user: string;
  title: string;
  description: string;
  type: "goal_completed" | "streak" | "milestone" | "first_contribution";
  value: number;
  icon: string;
  earnedAt: string;
  isSeen: boolean;
  createdAt: string;
  updatedAt: string;
}

// Get all achievements for the user
export const getAchievements = async (): Promise<AchievementInterface[]> => {
  try {
    const response = await axios.get(API_BASE_URL);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching achievements:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch achievements");
    }
  }
};

// Get unseen achievements for the user
export const getUnseenAchievements = async (): Promise<AchievementInterface[]> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/unseen`);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching unseen achievements:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch unseen achievements");
    }
  }
};

// Mark an achievement as seen
export const markAchievementAsSeen = async (id: string): Promise<AchievementInterface> => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${id}/mark-seen`);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error marking achievement as seen:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to mark achievement as seen");
    }
  }
};

export default {
  getAchievements,
  getUnseenAchievements,
  markAchievementAsSeen
};