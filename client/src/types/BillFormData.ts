interface BillFormData {
  name: string;
  amount: string | number;
  dueDate: string;
  category: string;
  isPaid?: boolean;
}

export default BillFormData;
