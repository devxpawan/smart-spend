import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Get spending insights and patterns
export const getSpendingPatterns = async (months = 3) => {
  try {
    const response = await axios.get(`${API_URL}/api/insights/spending-patterns?months=${months}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching spending patterns:", error);
    throw error;
  }
};

// Get quick insights summary for dashboard
export const getInsightsSummary = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/insights/summary`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching insights summary:", error);
    throw error;
  }
};

// Get personalized savings tips
export const getSavingsTips = async () => {
  try {
    const response = await axios.get(`${API_URL}/api/insights/savings-tips`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching savings tips:", error);
    throw error;
  }
};

// Get unusual spending alerts
export const getUnusualSpending = async (months = 3, severity = null) => {
  try {
    let url = `${API_URL}/api/insights/unusual-spending?months=${months}`;
    if (severity) {
      url += `&severity=${severity}`;
    }
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching unusual spending:", error);
    throw error;
  }
};