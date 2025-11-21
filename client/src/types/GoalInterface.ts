export default interface GoalInterface {
  _id: string;
  user: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  startDate: string;
  targetDate: string;
  description: string;
  contributions: {
    amount: number;
    date: string;
    description: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface GoalFormData {
  name: string;
  targetAmount: number | string;
  targetDate: string;
  description: string;
}