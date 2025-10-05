import React, { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import {
  X,
  AlertCircle,
  Package,
  Calendar,
  Store,
  DollarSign,
  FileText,
  ShieldCheck,
  Upload,
  Image,
  Trash2,
} from "lucide-react";
import { WarrantyImage } from "../types/WarrantyFormData";
import axios from "axios";
import CustomSelect from "./CustomSelect";

interface WarrantyFormData {
  productName: string;
  expirationDate: string;
  category: string;
  purchaseDate: string;
  retailer: string;
  notes: string;
  purchasePrice?: number;
  warrantyCardImages?: WarrantyImage[];
  isLifetimeWarranty?: boolean;
}

interface WarrantyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: WarrantyFormData) => Promise<void>;
  initialData?: WarrantyFormData;
  title: string;
  currency: string;
  warrantyId?: string; // Add warranty ID for editing mode
}

interface FormErrors {
  productName?: string;
  expirationDate?: string;
  category?: string;
  purchaseDate?: string;
  retailer?: string;
  notes?: string;
  purchasePrice?: string;
  warrantyCardImages?: string;
  isLifetimeWarranty?: string;
}

const WarrantyModal: React.FC<WarrantyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
  currency,
  warrantyId,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<WarrantyFormData>({
    productName: "",
    expirationDate: "",
    category: "",
    purchaseDate: "",
    retailer: "",
    notes: "",
    purchasePrice: undefined,
    warrantyCardImages: [],
    isLifetimeWarranty: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(
    null
  );
  const [dragActive, setDragActive] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    "Electronics (Phones, Laptops, TVs)",
    "Home Appliances (Washer, Fridge, etc.)",
    "Furniture",
    "Automobiles",
    "Power Tools",
    "Jewelry & Watches",
    "Sports Equipment",
    "Kitchenware",
    "Clothing & Footwear",
    "Smart Devices (Smartwatch, Home Assistants)",
    "Musical Instruments",
    "Office Equipment",
  ];

  

  // Initialize form data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        productName: "",
        expirationDate: "",
        category: "",
        purchaseDate: new Date().toISOString().split("T")[0],
        retailer: "",
        notes: "",
        purchasePrice: undefined,
        warrantyCardImages: [],
        isLifetimeWarranty: false,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.productName?.trim()) {
      newErrors.productName = "Product name is required";
    } else if (!/[a-zA-Z]/.test(formData.productName)) {
      newErrors.productName = "Product name must contain at least one alphabetic character";
    }

    if (!formData.isLifetimeWarranty && !formData.expirationDate) {
      newErrors.expirationDate = "Expiration date is required for non-lifetime warranties";
    } else if (!formData.isLifetimeWarranty && formData.expirationDate) {
      const expirationDate = new Date(formData.expirationDate);
      if (isNaN(expirationDate.getTime())) {
        newErrors.expirationDate = "Please enter a valid expiration date";
      }
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.purchaseDate) {
      newErrors.purchaseDate = "Purchase date is required";
    } else {
      const purchaseDate = new Date(formData.purchaseDate);
      if (isNaN(purchaseDate.getTime())) {
        newErrors.purchaseDate = "Please enter a valid purchase date";
      } else if (purchaseDate > new Date()) {
        newErrors.purchaseDate = "Purchase date cannot be in the future";
      }
    }

    // Validate purchase price if provided
    if (
      formData.purchasePrice !== undefined &&
      formData.purchasePrice < 0
    ) {
      newErrors.purchasePrice = "Purchase price cannot be negative";
    }

    // Validate notes length
    if (formData.notes && formData.notes.length > 1000) {
      newErrors.notes = "Notes must be less than 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : name === "purchasePrice"
            ? value
              ? parseFloat(value)
              : undefined
            : value,
      };

      // If lifetime warranty is checked, clear the expiration date
      if (name === "isLifetimeWarranty" && checked) {
        newFormData.expirationDate = "";
      }

      return newFormData;
    });

    // Clear field-specific error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  // Image upload functions
  const handleImageUpload = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.match(/^image\/(jpeg|jpg|png|gif)$/)) {
        setErrors((prev) => ({
          ...prev,
          warrantyCardImages:
            "Only image files (JPEG, PNG, GIF) are allowed",
        }));
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        setErrors((prev) => ({
          ...prev,
          warrantyCardImages: "File size must be less than 10MB",
        }));
        continue;
      }

      try {
        setUploadingImage(true);
        setErrors((prev) => ({ ...prev, warrantyCardImages: undefined }));

        const imageFormData = new FormData();
        imageFormData.append("warrantyImage", file);

        const response = await axios.post(
          "/api/warranties/upload-image",
          imageFormData
        );

        const imageData = response.data;

        setFormData((prev) => ({
          ...prev,
          warrantyCardImages: [
            ...(prev.warrantyCardImages || []),
            {
              url: imageData.url,
              publicId: imageData.publicId,
              format: imageData.format,
              bytes: imageData.bytes,
              width: imageData.width,
              height: imageData.height,
            },
          ],
        }));
      } catch (error) {
        console.error("Image upload error:", error);
        setErrors((prev) => ({
          ...prev,
          warrantyCardImages: "Failed to upload image. Please try again.",
        }));
      } finally {
        setUploadingImage(false);
      }
    }
  };

  const handleImageDelete = async (publicId: string) => {
    try {
      setDeletingImageId(publicId);
      setErrors((prev) => ({ ...prev, warrantyCardImages: undefined }));

      let endpoint: string;

      if (warrantyId) {
        endpoint = `/api/warranties/${warrantyId}/delete-image?publicId=${encodeURIComponent(
          publicId
        )}`;
      } else {
        const encodedPublicId = encodeURIComponent(publicId);
        endpoint = `/api/warranties/delete-image/${encodedPublicId}`;
      }

      await axios.delete(endpoint);

      setFormData((prev) => ({
        ...prev,
        warrantyCardImages:
          prev.warrantyCardImages?.filter(
            (img) => img.publicId !== publicId
          ) || [],
      }));
    } catch (error) {
      console.error("Image deletion error:", error);
      const errorMsg =
        axios.isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : "Failed to delete image. Please try again.";
      setErrors((prev) => ({
        ...prev,
        warrantyCardImages: errorMsg,
      }));
    } finally {
      setDeletingImageId(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (e.target.files && e.target.files.length > 0) {
      handleImageUpload(e.target.files);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const cleanedData = {
        ...formData,
        productName: formData.productName.trim(),
        retailer: formData.retailer.trim() || "",
        notes: formData.notes.trim() || "",
      };

      await onSubmit(cleanedData);
      onClose();
    } catch (err: unknown) {
      console.error("Error submitting warranty:", err);
      const error = err as Error;
      setErrors({ productName: error.message || "Failed to save warranty" });
    } finally {
      setLoading(false);
    }
  };

  // Focus trap for accessibility
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!modalRef.current) return;

    const focusableElements = modalRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusableElement = focusableElements[0] as HTMLElement;
    const lastFocusableElement = focusableElements[
      focusableElements.length - 1
    ] as HTMLElement;

    if (e.key === "Tab") {
      if (e.shiftKey) {
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastFocusableElement) {
          firstFocusableElement.focus();
          e.preventDefault();
        }
      }
    }
  }, []);

  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  // Setup event listeners
  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", trapFocus);
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";

      // Focus first input after animation
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        }
      }, 100);
    }

    return () => {
      document.removeEventListener("keydown", trapFocus);
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, trapFocus, handleEscape]);

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        aria-modal="true"
        role="dialog"
        aria-labelledby="modal-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] overflow-hidden"
          ref={modalRef}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <h2
                id="modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white"
              >
                {title ||
                  (initialData ? "Edit Warranty" : "Add New Warranty")}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white transition-colors p-2 rounded-lg hover:bg-white/50 dark:hover:bg-gray-600/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="productName"
                    className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"
                  >
                    Product Name *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Package className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="text"
                      name="productName"
                      id="productName"
                      value={formData.productName}
                      onChange={handleInputChange}
                      placeholder="e.g., iPhone 15 Pro, Samsung TV 55 inch"
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 dark:placeholder-gray-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.productName
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-purple-500"
                      }`}
                      required
                      ref={firstInputRef}
                      aria-invalid={errors.productName ? "true" : "false"}
                      aria-describedby={
                        errors.productName
                          ? "productName-error"
                          : undefined
                      }
                    />
                  </div>
                  {errors.productName && (
                    <div
                      id="productName-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.productName}</span>
                    </div>
                  )}
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"
                  >
                    Category *
                  </label>
                  <CustomSelect
                    options={categories.map((cat) => ({
                      value: cat,
                      label: cat,
                    }))}
                    value={formData.category}
                    onChange={(value) =>
                      handleInputChange({
                        target: { name: "category", value },
                      } as React.ChangeEvent<HTMLSelectElement>)
                    }
                    className={`${
                      errors.category
                        ? "border-red-300 focus:ring-red-500"
                        : "border-slate-300 focus:ring-purple-500"
                    }`}
                  />
                  {errors.category && (
                    <div
                      id="category-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.category}</span>
                    </div>
                  )}
                </div>

                {/* Purchase Date */}
                <div>
                  <label
                    htmlFor="purchaseDate"
                    className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"
                  >
                    Purchase Date *
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      name="purchaseDate"
                      id="purchaseDate"
                      value={formData.purchaseDate}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${
                        errors.purchaseDate
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-purple-500"
                      }`}
                      required
                      aria-invalid={errors.purchaseDate ? "true" : "false"}
                      aria-describedby={
                        errors.purchaseDate
                          ? "purchaseDate-error"
                          : undefined
                      }
                    />
                  </div>
                  {errors.purchaseDate && (
                    <div
                      id="purchaseDate-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {errors.purchaseDate}
                      </span>
                    </div>
                  )}
                </div>

                {/* Lifetime Warranty Checkbox */}
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-700 border border-green-200 dark:border-gray-700 rounded-lg">
                    <input
                      type="checkbox"
                      name="isLifetimeWarranty"
                      id="isLifetimeWarranty"
                      checked={formData.isLifetimeWarranty || false}
                      onChange={handleInputChange}
                      className="h-5 w-5 text-green-600 border-green-300 rounded focus:ring-green-500 focus:ring-2"
                      aria-describedby="lifetimeWarranty-help"
                    />
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                      <label
                        htmlFor="isLifetimeWarranty"
                        className="text-sm font-semibold text-green-800 dark:text-green-300 cursor-pointer"
                      >
                        Lifetime Warranty
                      </label>
                    </div>
                  </div>
                  <p
                    id="lifetimeWarranty-help"
                    className="mt-2 text-xs text-green-600 dark:text-green-400"
                  >
                    Check this if your product has a lifetime warranty. You won't need to specify an expiration date.
                  </p>
                </div>

                {/* Expiration Date */}
                <div>
                  <label
                    htmlFor="expirationDate"
                    className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"
                  >
                    Expiration Date {!formData.isLifetimeWarranty && "*"}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-slate-400 dark:text-gray-500" />
                    </div>
                    <input
                      type="date"
                      name="expirationDate"
                      id="expirationDate"
                      value={formData.expirationDate}
                      onChange={handleInputChange}
                      disabled={formData.isLifetimeWarranty}
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out bg-white dark:bg-gray-700 text-slate-900 dark:text-white ${
                        formData.isLifetimeWarranty
                          ? "bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-500 cursor-not-allowed"
                          : errors.expirationDate
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 dark:border-gray-600 focus:ring-purple-500"
                      }`}
                      required={!formData.isLifetimeWarranty}
                      aria-invalid={
                        errors.expirationDate ? "true" : "false"
                      }
                      aria-describedby={
                        errors.expirationDate
                          ? "expirationDate-error"
                          : undefined
                      }
                    />
                  </div>
                  {errors.expirationDate && (
                    <div
                      id="expirationDate-error"
                      className="mt-1 flex items-center space-x-1 text-red-600 dark:text-red-400"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {errors.expirationDate}
                      </span>
                    </div>
                  )}
                  {formData.isLifetimeWarranty && (
                    <p className="mt-1 text-xs text-green-600">
                      Expiration date is not required for lifetime warranties
                    </p>
                  )}
                </div>

                {/* Retailer */}
                <div>
                  <label
                    htmlFor="retailer"
                    className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-2"
                  >
                    Retailer
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Store className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="retailer"
                      id="retailer"
                      value={formData.retailer}
                      onChange={handleInputChange}
                      placeholder="e.g., Amazon, Best Buy, Apple Store"
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.retailer
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-purple-500"
                      }`}
                      aria-invalid={errors.retailer ? "true" : "false"}
                      aria-describedby={
                        errors.retailer ? "retailer-error" : undefined
                      }
                    />
                  </div>
                  {errors.retailer && (
                    <div
                      id="retailer-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.retailer}</span>
                    </div>
                  )}
                </div>

                {/* Purchase Price */}
                <div>
                  <label
                    htmlFor="purchasePrice"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Purchase Price
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                      type="number"
                      name="purchasePrice"
                      id="purchasePrice"
                      value={formData.purchasePrice || ""}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      className={`form-input block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out ${
                        errors.purchasePrice
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-purple-500"
                      }`}
                      aria-invalid={
                        errors.purchasePrice ? "true" : "false"
                      }
                      aria-describedby={
                        errors.purchasePrice
                          ? "purchasePrice-error"
                          : "purchasePrice-help"
                      }
                    />
                  </div>
                  {errors.purchasePrice && (
                    <div
                      id="purchasePrice-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {errors.purchasePrice}
                      </span>
                    </div>
                  )}
                  <p
                    id="purchasePrice-help"
                    className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                  >
                    Currency: {currency}
                  </p>
                </div>

                {/* Notes */}
                <div className="md:col-span-2">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-semibold text-slate-700 mb-2"
                  >
                    Notes (Optional)
                  </label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <FileText className="h-5 w-5 text-slate-400" />
                    </div>
                    <textarea
                      name="notes"
                      id="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={3}
                      maxLength={1000}
                      className={`form-textarea block w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:border-transparent sm:text-sm transition duration-150 ease-in-out resize-none ${
                        errors.notes
                          ? "border-red-300 focus:ring-red-500"
                          : "border-slate-300 focus:ring-purple-500"
                      }`}
                      placeholder="Additional warranty details, serial numbers, or important notes..."
                      aria-invalid={errors.notes ? "true" : "false"}
                      aria-describedby={
                        errors.notes ? "notes-error" : "notes-help"
                      }
                    />
                  </div>
                  {errors.notes && (
                    <div
                      id="notes-error"
                      className="mt-1 flex items-center space-x-1 text-red-600"
                    >
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">{errors.notes}</span>
                    </div>
                  )}
                  <p
                    id="notes-help"
                    className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                  >
                    {formData.notes?.length || 0}/1000 characters
                  </p>
                </div>

                {/* Warranty Card Images */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Warranty Card Images (Optional)
                  </label>

                  {/* Upload Area */}
                  <div
                    className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                      dragActive
                        ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20"
                        : "border-slate-300 dark:border-gray-600 hover:border-purple-400"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-slate-400 dark:text-gray-500" />
                      <div className="mt-4">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-purple-700 bg-purple-100 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:bg-purple-900/50 dark:text-purple-300 dark:hover:bg-purple-900"
                          disabled={uploadingImage}
                        >
                          {uploadingImage ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-700 border-t-transparent mr-2"></div>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Image className="w-4 h-4 mr-2" />
                              Choose Images
                            </>
                          )}
                        </button>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          or drag and drop images here
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        PNG, JPG, GIF up to 10MB each
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>

                  {errors.warrantyCardImages && (
                    <div className="mt-2 flex items-center space-x-1 text-red-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">
                        {errors.warrantyCardImages}
                      </span>
                    </div>
                  )}

                  {/* Image Preview */}
                  {formData.warrantyCardImages &&
                    formData.warrantyCardImages.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                          Uploaded Images (
                          {formData.warrantyCardImages.length})
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {formData.warrantyCardImages.map(
                            (image, index) => (
                              <div
                                key={image.publicId}
                                className="relative group"
                              >
                                <img
                                  src={image.url}
                                  alt={`Warranty card ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg border border-slate-200 dark:border-gray-700"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleImageDelete(image.publicId)
                                  }
                                  disabled={
                                    deletingImageId === image.publicId
                                  }
                                  className={`absolute top-1 right-1 p-1 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none focus:ring-2 focus:ring-red-500 ${
                                    deletingImageId === image.publicId
                                      ? "bg-red-400 cursor-not-allowed"
                                      : "bg-red-500 hover:bg-red-600"
                                  }`}
                                  title={
                                    deletingImageId === image.publicId
                                      ? "Deleting..."
                                      : "Delete image"
                                  }
                                >
                                  {deletingImageId === image.publicId ? (
                                    <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-6 border-t border-slate-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150 ease-in-out shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-150 ease-in-out shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed text-sm transform hover:scale-[1.02]"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      {initialData ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {initialData ? "Update Warranty" : "Create Warranty"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};

export default WarrantyModal;
