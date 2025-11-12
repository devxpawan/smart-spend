interface BillFormData {
  name: string;
  amount: string | number;
  dueDate: string;
  reminderDate?: string;
  category: string;
  isPaid?: boolean;
  bankAccount?: string;
}

export default BillFormData;
