import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { X, CheckCircle } from "lucide-react";
import QRCodeDisplay from "./QRCodeDisplay";

interface WarrantyQRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  warrantyId: string;
  productName: string;
  warrantyInfo?: {
    expirationDate?: string;
    retailer?: string;
    category?: string;
  };
}

const WarrantyQRCodeModal: React.FC<WarrantyQRCodeModalProps> = ({
  isOpen,
  onClose,
  warrantyId,
  productName,
  warrantyInfo,
}) => {
  if (!isOpen) return null;

  const qrCodeUrl = `${window.location.origin}/warranty/${warrantyId}`;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Warranty Created!
                </h3>
                <p className="text-xs text-gray-600">
                  QR code for {productName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* QR Code Display */}
          <div className="mb-4">
            <QRCodeDisplay
              value={qrCodeUrl}
              title="Warranty QR Code"
              description="Scan to view warranty details"
              size={160}
              warrantyInfo={{
                productName,
                ...warrantyInfo,
              }}
            />
          </div>

          {/* Usage Instructions */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-xs font-medium text-blue-800 mb-1">
              Quick tips:
            </h4>
            <ul className="text-xs text-blue-700 space-y-0.5">
              <li>• Print and attach to product</li>
              <li>• Share with repair shops</li>
              <li>• Works on any smartphone</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
            >
              Close
            </button>
            <button
              onClick={() => window.open(qrCodeUrl, "_blank")}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              View Page
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default WarrantyQRCodeModal;
