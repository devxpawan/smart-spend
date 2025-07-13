import QRCode from "qrcode";
import cloudinary from "../cloudinary.js";

/**
 * Generate QR code as base64 data URL
 * @param {string} data - Data to encode in QR code
 * @param {object} options - QR code options
 * @returns {Promise<string>} Base64 data URL of QR code
 */
export const generateQRCodeDataURL = async (data, options = {}) => {
  try {
    const qrOptions = {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
      ...options,
    };

    const qrCodeDataURL = await QRCode.toDataURL(data, qrOptions);
    return qrCodeDataURL;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code");
  }
};

/**
 * Generate QR code and upload to Cloudinary
 * @param {string} data - Data to encode in QR code
 * @param {string} warrantyId - Warranty ID for folder organization
 * @param {object} options - QR code options
 * @returns {Promise<object>} Cloudinary upload result
 */
export const generateAndUploadQRCode = async (data, warrantyId, options = {}) => {
  try {
    // Generate QR code as buffer
    const qrOptions = {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
      ...options,
    };

    const qrCodeBuffer = await QRCode.toBuffer(data, qrOptions);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: `warranty-qr-codes/${warrantyId}`,
            resource_type: "image",
            public_id: `qr-${warrantyId}`,
            transformation: [
              { width: 300, height: 300, crop: "fit" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          },
          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        )
        .end(qrCodeBuffer);
    });

    return {
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id,
      format: uploadResult.format,
      bytes: uploadResult.bytes,
      width: uploadResult.width,
      height: uploadResult.height,
    };
  } catch (error) {
    console.error("Error generating and uploading QR code:", error);
    throw new Error("Failed to generate and upload QR code");
  }
};

/**
 * Generate warranty QR code URL
 * @param {string} warrantyId - Warranty ID
 * @param {string} baseUrl - Base URL of the application
 * @returns {string} QR code URL
 */
export const generateWarrantyQRCodeURL = (warrantyId, baseUrl) => {
  return `${baseUrl}/warranty/${warrantyId}`;
};

/**
 * Delete QR code from Cloudinary
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<object>} Deletion result
 */
export const deleteQRCodeFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`Deleted QR code from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error(`Failed to delete QR code ${publicId}:`, error);
    throw error;
  }
};
