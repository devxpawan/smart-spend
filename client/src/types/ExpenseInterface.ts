interface ExpenseInterface {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  isRecurring?: boolean;
  recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: string;
  bankAccount?: string;
}

export default ExpenseInterface;
