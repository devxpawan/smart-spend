interface ExpenseInterface {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;

  bankAccount?: string;
}

export default ExpenseInterface;