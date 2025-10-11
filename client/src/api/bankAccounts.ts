import api from './api';
import BankAccountInterface from '../types/BankAccountInterface';

export const getBankAccounts = async (): Promise<BankAccountInterface[]> => {
  const response = await api.get('/bank-accounts');
  return response.data;
};

export const createBankAccount = async (accountData: Omit<BankAccountInterface, '_id' | 'user' | 'createdAt' | 'updatedAt' | 'currentBalance'>): Promise<BankAccountInterface> => {
  const response = await api.post('/bank-accounts', accountData);
  return response.data;
};

export const updateBankAccount = async (id: string, accountData: Partial<Omit<BankAccountInterface, '_id' | 'user' | 'createdAt' | 'updatedAt' | 'currentBalance'>>): Promise<BankAccountInterface> => {
  const response = await api.put(`/bank-accounts/${id}`, accountData);
  return response.data;
};

export const deleteBankAccount = async (id: string): Promise<void> => {
  await api.delete(`/bank-accounts/${id}`);
};
