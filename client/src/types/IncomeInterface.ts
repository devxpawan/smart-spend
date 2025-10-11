export default interface IncomeInterface {
    _id: string;
    amount: number;
    description: string;
    category: string;
    date: string;
    notes?: string;
    bankAccount?: string;
  }
  