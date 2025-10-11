export default interface IncomeFormData {
    amount: number | string;
    description: string;
    category: string;
    date: string;
    notes?: string;
    bankAccount?: string;
  }
  