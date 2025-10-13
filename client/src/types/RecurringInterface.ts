export default interface RecurringInterface {
  _id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringInterval?: "daily" | "weekly" | "monthly" | "yearly";
  recurringEndDate?: string;
  nextRecurringDate?: string;
  type: "expense" | "income";
  bankAccount?: string;
  paymentMethod?: string;
}