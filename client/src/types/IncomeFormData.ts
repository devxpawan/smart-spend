export default interface IncomeFormData {
    amount: number | string;
    description: string;
    category: string;
    date: string;
    bankAccount?: string;
    isRecurring?: boolean;
    recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
    recurringEndDate?: string;
  }