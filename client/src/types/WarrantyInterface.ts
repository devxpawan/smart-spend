import { WarrantyImage } from './WarrantyFormData';

interface WarrantyInterface {
  _id: string;
  productName: string;
  expirationDate: string;
  category: string;
  purchaseDate?: string;
  retailer?: string;
  notes?: string;
  purchasePrice?: number;
  currency?: string;
  documentUrls?: string[];
  warrantyCardImages?: WarrantyImage[];
  reminderDate?: string;
  user: string;
  createdAt: string;
  updatedAt?: string;
}

export default WarrantyInterface;
