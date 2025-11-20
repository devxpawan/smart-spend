import api from "./api";

export const getCustomRemindersCount = async () => {
  try {
    const res = await api.get("/bills/custom/reminders/count");
    return res.data.count; // return only the number
  } catch (error) {
    console.error("Error fetching custom reminders count:", error);
    throw error;
  }
};
