import axios from "axios";
import NotificationInterface from "../types/NotificationInterface";

const API_BASE_URL = "/api/notifications";

// Get all notifications for the user
export const getNotifications = async (token?: string): Promise<NotificationInterface[]> => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await axios.get(API_BASE_URL, config);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error fetching notifications:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to fetch notifications");
    }
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (id: string, token?: string): Promise<NotificationInterface> => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await axios.put(`${API_BASE_URL}/${id}`, {}, config);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error marking notification as read:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to mark notification as read");
    }
  }
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async (token?: string): Promise<{ message: string }> => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await axios.put(API_BASE_URL, {}, config);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error marking all notifications as read:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to mark all notifications as read");
    }
  }
};

// Delete a notification
export const deleteNotification = async (id: string, token?: string): Promise<{ message: string }> => {
  try {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
    const response = await axios.delete(`${API_BASE_URL}/${id}`, config);
    return response.data;
  } catch (error: unknown) {
    console.error("API Error deleting notification:", error);
    
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
      throw new Error((error instanceof Error) ? error.message : "Failed to delete notification");
    }
  }
};