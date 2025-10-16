export default interface IncomeInterface {
    _id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    isRecurring?: boolean;
    recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
    recurringEndDate?: string;
    bankAccount?: string;
  }