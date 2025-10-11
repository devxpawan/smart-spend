interface ExpenseInterface {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  notes?: string;
  bankAccount?: string;
}

export default ExpenseInterface;