interface BankAccountInterface {
  _id: string;
  user: string;
  bankName: string;
  accountName: string;
  accountType: 'Checking' | 'Savings' | 'Credit Card' | 'Investment' | 'Other';
  initialBalance: number;
  currentBalance: number;
  createdAt: string;
  updatedAt: string;
}

export default BankAccountInterface;
