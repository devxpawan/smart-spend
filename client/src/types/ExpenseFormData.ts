interface ExpenseFormData {
  description: string;
  amount: string | number;
  date: string;
  category: string;
  bankAccount?: string;
  isRecurring?: boolean;
  recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: string;
}

export default ExpenseFormData;