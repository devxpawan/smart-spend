interface BillInterface {
  _id: string;
  name: string;
  amount: number;
  dueDate: string;
  category: string;
  isPaid: boolean;
  reminderDate?: string;
  notes?: string;
  user: string;
  bankAccount?: string;
}

export default BillInterface;