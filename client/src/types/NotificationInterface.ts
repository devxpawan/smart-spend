export default interface NotificationInterface {
  _id: string;
  user: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  relatedTransaction?: string;
  relatedTransactionType?: "Expense" | "Income";
  createdAt: string;
}