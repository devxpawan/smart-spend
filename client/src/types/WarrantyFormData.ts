interface WarrantyImage {
  url: string;
  publicId: string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  uploadedAt?: string;
}

interface WarrantyFormData {
  productName: string;
  expirationDate: string;
  category: string;
  purchaseDate?: string;
  retailer?: string;
  notes?: string;
  purchasePrice?: number;
  warrantyCardImages?: WarrantyImage[];
  isLifetimeWarranty?: boolean;
}

export type { WarrantyImage };

export default WarrantyFormData;
