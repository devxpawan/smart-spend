interface ExpenseFormData {
  description: string;
  amount: string | number;
  date: string;
  category: string;
  notes?: string;
  bankAccount?: string;
}

export default ExpenseFormData;