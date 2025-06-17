interface BillInterface {
  _id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid: boolean;
  isRecurring?: boolean;
  recurringPeriod?: string;
  reminderDate?: string;
  notes?: string;
  user: string;
}

export default BillInterface;