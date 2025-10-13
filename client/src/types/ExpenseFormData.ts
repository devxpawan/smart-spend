interface ExpenseFormData {
  description: string;
  amount: string | number;
  date: string;
  category: string;

  bankAccount?: string;
}

export default ExpenseFormData;