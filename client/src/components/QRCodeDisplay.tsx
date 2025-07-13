import React, { useState } from "react";
import QRCode from "react-qr-code";
import {
  Download,
  Copy,
  X,
  QrCode,
  ExternalLink,
  Printer,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";

interface QRCodeDisplayProps {
  value: string;
  title?: string;
  description?: string;
  size?: number;
  showModal?: boolean;
  onClose?: () => void;
  warrantyInfo?: {
    productName?: string;
    expirationDate?: string;
    retailer?: string;
    category?: string;
  };
}

const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  title = "QR Code",
  description,
  size = 200,
  showModal = false,
  onClose,
  warrantyInfo,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDownload = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    canvas.width = size;
    canvas.height = size;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;

            // Generate filename with product name and ID
            let filename = "warranty-qr-code";

            // Extract warranty ID from the QR code value (URL)
            const warrantyIdMatch = value.match(
              /\/warranty\/([a-f0-9]{24})$/i
            );
            const warrantyId = warrantyIdMatch ? warrantyIdMatch[1] : null;

            // Create a clean filename using product name and ID
            if (warrantyInfo?.productName || warrantyId) {
              const productName = warrantyInfo?.productName || "Product";
              // Clean product name for filename (remove special characters)
              const cleanProductName = productName
                .replace(/[^a-zA-Z0-9\s-]/g, "")
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-") // Replace multiple dashes with single dash
                .replace(/^-+|-+$/g, "") // Remove leading/trailing dashes
                .substring(0, 30); // Limit length

              const idPart = warrantyId
                ? `-${warrantyId.substring(0, 8)}`
                : "";
              filename = `${cleanProductName}${idPart}-QR`;
            }

            a.download = `${filename}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      }
    };

    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  };

  const handleOpenLink = () => {
    window.open(value, "_blank");
  };

  const handlePrint = () => {
    const svg = document.getElementById("qr-code-svg");
    if (!svg) return;

    // Create a minimal printable version for product attachment
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const svgData = new XMLSerializer().serializeToString(svg);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Product QR Code</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 10px;
              text-align: center;
              background: white;
            }
            .qr-container {
              border: 1px solid #000;
              padding: 8px;
              margin: 0 auto;
              width: 120px;
              height: 140px;
              background: white;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
            }
            .qr-code {
              width: 100px;
              height: 100px;
            }
            .qr-code svg {
              width: 100% !important;
              height: 100% !important;
            }
            .product-name {
              font-size: 8px;
              font-weight: bold;
              margin-top: 4px;
              text-align: center;
              line-height: 1.1;
              max-height: 20px;
              overflow: hidden;
            }
            @media print {
              body {
                margin: 0;
                padding: 5px;
              }
              .qr-container {
                border: 1px solid #000;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <div class="qr-code">${svgData}</div>
            ${
              warrantyInfo?.productName
                ? `<div class="product-name">${warrantyInfo.productName}</div>`
                : ""
            }
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const QRCodeContent = () => (
    <div className="text-center">
      <div className="bg-white p-3 rounded-lg inline-block shadow-sm border">
        <QRCode
          id="qr-code-svg"
          value={value}
          size={size}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          viewBox="0 0 256 256"
        />
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex flex-wrap gap-1.5 justify-center">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center px-2.5 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
          >
            <Copy className="w-3 h-3 mr-1.5" />
            {copied ? "Copied!" : "Copy"}
          </button>

          <button
            onClick={handleDownload}
            className="inline-flex items-center px-2.5 py-1.5 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-md transition-colors"
          >
            <Download className="w-3 h-3 mr-1.5" />
            Download
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center px-2.5 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors"
          >
            <Printer className="w-3 h-3 mr-1.5" />
            Print
          </button>

          <button
            onClick={handleOpenLink}
            className="inline-flex items-center px-2.5 py-1.5 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors"
          >
            <ExternalLink className="w-3 h-3 mr-1.5" />
            Open
          </button>
        </div>

        {description && (
          <p className="text-xs text-gray-600 max-w-xs mx-auto">
            {description}
          </p>
        )}
      </div>
    </div>
  );

  if (showModal && onClose) {
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
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <QrCode className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {title}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <QRCodeContent />
          </motion.div>
        </motion.div>
      </AnimatePresence>,
      document.body
    );
  }

  return <QRCodeContent />;
};

export default QRCodeDisplay;
