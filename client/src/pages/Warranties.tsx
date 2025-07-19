import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Calendar,
  Package,
  Store,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  ShieldCheck,
  Edit3,
  X,
  RefreshCw,
  Clock,
  DollarSign,
  Image,
  ChevronLeft,
  ChevronRight,
  QrCode,
} from "lucide-react";
import WarrantyModal from "../components/WarrantyModal";
import ConfirmModal from "../components/ConfirmModal";
import WarrantyQRCodeModal from "../components/WarrantyQRCodeModal";
import { useAuth } from "../contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { format, parseISO, isValid, differenceInDays } from "date-fns";
import { WarrantyImage } from "../types/WarrantyFormData";
import WarrantyInterface from "../types/WarrantyInterface";

// Using WarrantyInterface from types

interface LocalWarrantyFormData {
  productName: string;
  expirationDate: string;
  category: string;
  purchaseDate: string;
  retailer: string;
  notes: string;
  purchasePrice?: number;
  warrantyCardImages?: WarrantyImage[];
}

interface PaginationData {
  total: number;
  page: number;
  pages: number;
}

interface FilterConfig {
  category: string;
  status: string;
  searchTerm: string;
}

const Warranties: React.FC = () => {
  const { user } = useAuth();

  // State management
  const [warranties, setWarranties] = useState<WarrantyInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedWarrantyToEdit, setSelectedWarrantyToEdit] =
    useState<WarrantyInterface | null>(null);
  const [selectedWarrantyForDetail, setSelectedWarrantyForDetail] =
    useState<WarrantyInterface | null>(null);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    pages: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    id: "",
  });
  const [qrCodeModal, setQrCodeModal] = useState({
    open: false,
    warrantyId: "",
    productName: "",
    warrantyInfo: {
      expirationDate: "",
      retailer: "",
      category: "",
    },
  });

  // Image viewer state
  const [showImageViewer, setShowImageViewer] = useState(false);
  const [selectedImages, setSelectedImages] = useState<any[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Enhanced filtering
  const [filters, setFilters] = useState<FilterConfig>({
    category: "",
    status: "",
    searchTerm: "",
  });

  const [formData, setFormData] = useState<LocalWarrantyFormData>({
    productName: "",
    expirationDate: "",
    category: "Electronics (Phones, Laptops, TVs)",
    purchaseDate: "",
    retailer: "",
    notes: "",
    purchasePrice: undefined,
  });

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

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch warranties function
  const fetchWarranties = useCallback(
    async (page: number = 1) => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
        });

        if (filters.category) {
          params.append("category", filters.category);
        }

        if (filters.status) {
          params.append("expired", filters.status);
        }

        const response = await axios.get(
          `/api/warranties?${params.toString()}`
        );

        if (response.data.warranties) {
          setWarranties(response.data.warranties);
          setPagination(response.data.pagination);
        } else {
          setWarranties(response.data);
          setPagination({
            total: response.data.length,
            page: 1,
            pages: 1,
          });
        }

        return response.data.warranties || response.data;
      } catch (err: any) {
        console.error("Error fetching warranties:", err);
        if (err.response?.status === 401) {
          setError("You are not authorized. Please log in again.");
        } else {
          setError("Failed to load warranties. Please try again.");
        }
        return [];
      } finally {
        setLoading(false);
      }
    },
    [filters.category, filters.status]
  );

  // Load warranties on component mount and when filters change
  useEffect(() => {
    fetchWarranties(currentPage);
  }, [currentPage, fetchWarranties]);

  // Memoized filtered warranties and stats
  const { filteredWarranties, stats } = useMemo(() => {
    let filtered = warranties.filter((warranty: WarrantyInterface) => {
      // Search filter
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          warranty.productName.toLowerCase().includes(searchLower) ||
          warranty.category.toLowerCase().includes(searchLower) ||
          (warranty.retailer &&
            warranty.retailer.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });

    // Calculate stats
    const now = new Date();
    const active = filtered.filter(
      (w) => new Date(w.expirationDate) > now
    ).length;
    const expired = filtered.filter(
      (w) => new Date(w.expirationDate) <= now
    ).length;
    const expiringSoon = filtered.filter((w) => {
      const expDate = new Date(w.expirationDate);
      const daysUntilExpiry = differenceInDays(expDate, now);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    }).length;
    const totalValue = filtered.reduce(
      (sum, w) => sum + (w.purchasePrice || 0),
      0
    );

    return {
      filteredWarranties: filtered,
      stats: {
        active,
        expired,
        expiringSoon,
        totalValue,
        total: filtered.length,
      },
    };
  }, [warranties, filters.searchTerm]);

  // Utility functions
  const isExpired = useCallback((expirationDate: string) => {
    return new Date(expirationDate) < new Date();
  }, []);

  const isExpiringSoon = useCallback((expirationDate: string) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    const daysUntilExpiry = differenceInDays(expDate, today);
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  }, []);

  const getDaysUntilExpiry = useCallback((expirationDate: string) => {
    const expDate = new Date(expirationDate);
    const today = new Date();
    return differenceInDays(expDate, today);
  }, []);

  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "N/A";
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "MMM d, yyyy") : "Invalid Date";
  }, []);

  // Event handlers
  const handleSubmit = async (data: LocalWarrantyFormData) => {
    try {
      setLoading(true);
      setError("");

      const warrantyData = {
        productName: data.productName?.trim(),
        expirationDate: data.expirationDate,
        category: data.category,
        purchaseDate: data.purchaseDate || undefined,
        retailer: data.retailer?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
        purchasePrice: data.purchasePrice || undefined,
        currency: user?.preferences?.currency || "USD",
        warrantyCardImages: data.warrantyCardImages || [],
      };

      const cleanedData = Object.fromEntries(
        Object.entries(warrantyData).filter(
          ([_, value]) => value !== undefined && value !== ""
        )
      );

      let createdWarranty = null;

      if (selectedWarrantyToEdit) {
        await axios.put(
          `/api/warranties/${selectedWarrantyToEdit._id}`,
          cleanedData
        );
      } else {
        const response = await axios.post("/api/warranties", cleanedData);
        createdWarranty = response.data;
      }

      const updatedWarranties = await fetchWarranties(currentPage);

      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setSelectedWarrantyToEdit(null);

      // Show QR code modal for new warranties
      if (createdWarranty) {
        setQrCodeModal({
          open: true,
          warrantyId: createdWarranty._id,
          productName: createdWarranty.productName,
          warrantyInfo: {
            expirationDate: createdWarranty.expirationDate,
            retailer: createdWarranty.retailer,
            category: createdWarranty.category,
          },
        });
      }

      if (selectedWarrantyForDetail) {
        const updatedDetail =
          updatedWarranties.find(
            (w: WarrantyInterface) =>
              w._id === selectedWarrantyForDetail._id
          ) || null;
        setSelectedWarrantyForDetail(updatedDetail);
      }

      resetFormData();
    } catch (err: any) {
      console.error("Error creating/updating warranty:", err);

      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errorMessages = err.response.data.errors
          .map((e: any) => e.msg || e.message)
          .join(", ");
        setError(errorMessages);
      } else {
        setError("Failed to save warranty. Please try again.");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetFormData = () => {
    setFormData({
      productName: "",
      expirationDate: "",
      category: "Electronics (Phones, Laptops, TVs)",
      purchaseDate: "",
      retailer: "",
      notes: "",
      purchasePrice: undefined,
      warrantyCardImages: [],
    });
  };

  const handleEdit = (warranty: WarrantyInterface) => {
    setSelectedWarrantyToEdit(warranty);
    setFormData({
      productName: warranty.productName,
      expirationDate: warranty.expirationDate.split("T")[0],
      category: warranty.category,
      purchaseDate: warranty.purchaseDate
        ? warranty.purchaseDate.split("T")[0]
        : "",
      retailer: warranty.retailer || "",
      notes: warranty.notes || "",
      purchasePrice: warranty.purchasePrice || undefined,
      warrantyCardImages: warranty.warrantyCardImages || [],
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    setConfirmModal({ open: true, id: id });
  };

  const handleViewImages = (images: any[], startIndex: number = 0) => {
    setSelectedImages(images);
    setCurrentImageIndex(startIndex);
    setShowImageViewer(true);
  };

  const handleShowQRCode = (warranty: WarrantyInterface) => {
    setQrCodeModal({
      open: true,
      warrantyId: warranty._id,
      productName: warranty.productName,
      warrantyInfo: {
        expirationDate: warranty.expirationDate,
        retailer: warranty.retailer || "",
        category: warranty.category,
      },
    });
  };

  const handleViewDetails = (warranty: WarrantyInterface) => {
    setSelectedWarrantyForDetail(warranty);
    setIsDetailModalOpen(true);
  };

  const confirmDelete = async (id: string) => {
    try {
      setLoading(true);
      setConfirmModal({ open: false, id: "" });
      await axios.delete(`/api/warranties/${id}`);
      await fetchWarranties(currentPage);

      if (selectedWarrantyForDetail?._id === id) {
        setSelectedWarrantyForDetail(null);
        setIsDetailModalOpen(false);
      }
    } catch (err: any) {
      console.error("Error deleting warranty:", err);
      setError("Failed to delete warranty. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  if (loading && warranties.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-slate-600 font-medium">
            Loading your warranties...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Enhanced Header with Stats */}
      <header className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-purple-500 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Warranties Manager
              </h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">
                Track and manage your product warranties and coverage
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              resetFormData();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm font-semibold transform hover:scale-[1.02] w-full sm:w-auto"
          >
            <Plus className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
            Add New Warranty
          </button>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
          <span className="text-slate-500">{stats.total} warranties</span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-green-600 font-medium">
            {stats.active} active
          </span>
          <span className="text-slate-500 hidden sm:inline">•</span>
          <span className="text-amber-600 font-medium">
            {stats.expiringSoon} expiring soon
          </span>
          {stats.totalValue > 0 && (
            <>
              <span className="text-slate-500 hidden sm:inline">•</span>
              <span className="text-slate-500">
                Value: {user?.preferences?.currency || "USD"}{" "}
                {stats.totalValue.toFixed(2)}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Simplified Filters and Search */}
      <div className="bg-white p-3 sm:p-4 rounded-lg border shadow-sm space-y-3 sm:space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search warranties..."
            value={filters.searchTerm}
            onChange={(e) =>
              handleFilterChange("searchTerm", e.target.value)
            }
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
          />
        </div>

        {/* Filters */}
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
          {/* First Row - Category and Status Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Category Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Category:
              </label>
              <select
                value={filters.category}
                onChange={(e) =>
                  handleFilterChange("category", e.target.value)
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Status:
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  handleFilterChange("status", e.target.value)
                }
                className="px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-md focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
              >
                <option value="">All Warranties</option>
                <option value="false">Active Only</option>
                <option value="true">Expired Only</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:ml-auto">
            {/* Clear Filters */}
            <button
              onClick={() => {
                setFilters({ category: "", status: "", searchTerm: "" });
                setCurrentPage(1);
              }}
              className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors font-medium"
            >
              Clear Filters
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => fetchWarranties(currentPage)}
              className="flex items-center justify-center px-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
              title="Refresh warranties"
              disabled={loading}
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-800">
                  Error Occurred
                </h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-600 focus:outline-none"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Warranties Table or Empty State */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {loading && warranties.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
              <span className="text-slate-600 font-medium">
                Loading warranties...
              </span>
            </div>
          </div>
        ) : filteredWarranties.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {warranties.length === 0
                  ? "No Warranties Yet"
                  : "No Warranties Found"}
              </h3>
              <p className="text-gray-600 mb-4">
                {warranties.length === 0
                  ? "Start protecting your investments by adding your first warranty."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {warranties.length === 0 && (
                <button
                  onClick={() => {
                    resetFormData();
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm font-semibold transform hover:scale-[1.02]"
                >
                  <Plus className="mr-2 w-5 h-5" />
                  Add Your First Warranty
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              <div className="divide-y divide-gray-200">
                {filteredWarranties.map((warranty) => {
                  const daysUntilExpiry = getDaysUntilExpiry(
                    warranty.expirationDate
                  );
                  const expired = isExpired(warranty.expirationDate);
                  const expiringSoon = isExpiringSoon(
                    warranty.expirationDate
                  );

                  return (
                    <div key={warranty._id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <button
                            onClick={() => handleViewDetails(warranty)}
                            className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                          >
                            <span className="truncate">
                              {warranty.productName}
                            </span>
                            <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                          </button>
                          <div className="mt-1 flex items-center space-x-2">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                              {warranty.category}
                            </span>
                            {expired ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Expired
                              </span>
                            ) : expiringSoon ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="h-3 w-3 mr-1" />
                                Expiring Soon
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-gray-600 text-xs">
                            Expires:
                          </div>
                          <div className="font-medium">
                            {formatDate(warranty.expirationDate)}
                          </div>
                          {!expired && (
                            <div className="text-xs text-gray-500">
                              {daysUntilExpiry > 0
                                ? `${daysUntilExpiry} days left`
                                : "Expires today"}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">
                            Retailer:
                          </div>
                          <div className="font-medium">
                            {warranty.retailer || "N/A"}
                          </div>
                          {warranty.purchasePrice && (
                            <div className="text-xs text-gray-500">
                              {user?.preferences?.currency || "USD"}{" "}
                              {warranty.purchasePrice.toFixed(2)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center space-x-2">
                          {warranty.warrantyCardImages &&
                          warranty.warrantyCardImages.length > 0 ? (
                            <div className="flex items-center space-x-1">
                              <div
                                className="flex -space-x-1 cursor-pointer hover:scale-105 transition-transform"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewImages(
                                    warranty.warrantyCardImages || [],
                                    0
                                  );
                                }}
                              >
                                {warranty.warrantyCardImages
                                  .slice(0, 2)
                                  .map((image, index) => (
                                    <img
                                      key={image.publicId}
                                      src={image.url}
                                      alt={`Warranty card ${index + 1}`}
                                      className="w-6 h-6 rounded-full border border-white object-cover shadow-sm"
                                    />
                                  ))}
                              </div>
                              {warranty.warrantyCardImages.length > 2 && (
                                <span className="text-xs text-slate-500">
                                  +{warranty.warrantyCardImages.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center text-slate-400">
                              <Image className="w-4 h-4 mr-1" />
                              <span className="text-xs">No images</span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowQRCode(warranty);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-105"
                          title="Show QR Code"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      <div className="flex items-center space-x-1">
                        <Package className="w-4 h-4" />
                        <span>Product</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center space-x-2">
                        <Image className="w-4 h-4" />
                        <span>Images</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Category
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Expiration</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-left text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center space-x-2">
                        <Store className="w-4 h-4" />
                        <span>Retailer</span>
                      </div>
                    </th>
                    <th
                      scope="col"
                      className="px-4 lg:px-6 py-4 text-center text-xs font-bold text-slate-700 uppercase tracking-wider"
                    >
                      <div className="flex items-center justify-center space-x-2">
                        <QrCode className="w-4 h-4" />
                        <span>QR Code</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {filteredWarranties.map((warranty) => {
                    const daysUntilExpiry = getDaysUntilExpiry(
                      warranty.expirationDate
                    );
                    const expired = isExpired(warranty.expirationDate);
                    const expiringSoon = isExpiringSoon(
                      warranty.expirationDate
                    );

                    return (
                      <tr key={warranty._id} className="hover:bg-gray-50">
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center mr-3 lg:mr-4 shadow-md">
                              <Package className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            </div>
                            <div>
                              <button
                                onClick={() => handleViewDetails(warranty)}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                              >
                                <span>{warranty.productName}</span>
                                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              {warranty.purchasePrice && (
                                <div className="text-sm text-gray-600 font-medium mt-1 flex items-center">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  {user?.preferences?.currency ||
                                    "USD"}{" "}
                                  {warranty.purchasePrice.toFixed(2)}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {warranty.warrantyCardImages &&
                            warranty.warrantyCardImages.length > 0 ? (
                              <div className="flex items-center space-x-2">
                                <div
                                  className="flex -space-x-2 cursor-pointer hover:scale-105 transition-transform"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewImages(
                                      warranty.warrantyCardImages || [],
                                      0
                                    );
                                  }}
                                >
                                  {warranty.warrantyCardImages
                                    .slice(0, 3)
                                    .map((image, index) => (
                                      <img
                                        key={image.publicId}
                                        src={image.url}
                                        alt={`Warranty card ${index + 1}`}
                                        className="w-6 h-6 lg:w-8 lg:h-8 rounded-full border-2 border-white object-cover shadow-sm hover:border-purple-300"
                                      />
                                    ))}
                                </div>
                                {warranty.warrantyCardImages.length >
                                  3 && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    +
                                    {warranty.warrantyCardImages.length -
                                      3}{" "}
                                    more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center text-slate-400">
                                <Image className="w-4 h-4 mr-1" />
                                <span className="text-xs">No images</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                            {warranty.category}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="text-sm text-slate-900 font-medium">
                                {formatDate(warranty.expirationDate)}
                              </div>
                              {!expired && (
                                <div className="text-xs text-slate-500">
                                  {daysUntilExpiry > 0
                                    ? `${daysUntilExpiry} days left`
                                    : "Expires today"}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          {expired ? (
                            <span className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 shadow-sm">
                              <AlertCircle className="h-3 w-3 mr-1 lg:mr-1.5" />
                              Expired
                            </span>
                          ) : expiringSoon ? (
                            <span className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
                              <Clock className="h-3 w-3 mr-1 lg:mr-1.5" />
                              Expiring Soon
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-sm">
                              <CheckCircle className="h-3 w-3 mr-1 lg:mr-1.5" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Store className="h-4 w-4 text-slate-400" />
                            <div className="text-sm text-slate-900 font-medium">
                              {warranty.retailer || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleShowQRCode(warranty);
                            }}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 transition-all duration-200 hover:scale-105"
                            title="Show QR Code"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Enhanced Pagination */}
        {pagination.pages > 1 && (
          <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-slate-200 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-slate-700 font-medium">
                Showing {(pagination.page - 1) * 10 + 1} to{" "}
                {Math.min(pagination.page * 10, pagination.total)} of{" "}
                {pagination.total} results
              </div>
              <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Previous
                </button>
                {Array.from(
                  { length: pagination.pages },
                  (_, i) => i + 1
                ).map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg font-medium transition-colors ${
                      page === pagination.page
                        ? "bg-purple-600 text-white border-purple-600 shadow-md"
                        : "border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <WarrantyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmit}
        title="Add New Warranty"
        currency={user?.preferences?.currency || "USD"}
      />

      {/* Edit Modal */}
      <WarrantyModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedWarrantyToEdit(null);
          resetFormData();
        }}
        onSubmit={handleSubmit}
        initialData={formData}
        title="Edit Warranty"
        currency={user?.preferences?.currency || "USD"}
        warrantyId={selectedWarrantyToEdit?._id}
      />

      {/* Enhanced Detail Modal */}
      {createPortal(
        <AnimatePresence>
          {isDetailModalOpen && selectedWarrantyForDetail && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                setIsDetailModalOpen(false);
                setSelectedWarrantyForDetail(null);
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto mx-4 sm:mx-0"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-violet-50">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center shadow-lg">
                      <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                      Warranty Details
                    </h2>
                  </div>
                  <button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      setSelectedWarrantyForDetail(null);
                    }}
                    className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-lg hover:bg-white/50"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Product Name
                      </label>
                      <p className="text-slate-900 text-base font-medium bg-slate-50 p-3 rounded-lg">
                        {selectedWarrantyForDetail.productName}
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Category
                      </label>
                      <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg">
                        {selectedWarrantyForDetail.category}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {selectedWarrantyForDetail.purchaseDate && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Purchase Date
                          </label>
                          <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg">
                            {formatDate(
                              selectedWarrantyForDetail.purchaseDate
                            )}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Expiration Date
                        </label>
                        <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg">
                          {formatDate(
                            selectedWarrantyForDetail.expirationDate
                          )}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Status
                      </label>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        {isExpired(
                          selectedWarrantyForDetail.expirationDate
                        ) ? (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Expired
                          </span>
                        ) : isExpiringSoon(
                            selectedWarrantyForDetail.expirationDate
                          ) ? (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-4 w-4 mr-2" />
                            Expiring Soon (
                            {getDaysUntilExpiry(
                              selectedWarrantyForDetail.expirationDate
                            )}{" "}
                            days left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Active (
                            {getDaysUntilExpiry(
                              selectedWarrantyForDetail.expirationDate
                            )}{" "}
                            days left)
                          </span>
                        )}
                      </div>
                    </div>

                    {(selectedWarrantyForDetail.retailer ||
                      selectedWarrantyForDetail.purchasePrice) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {selectedWarrantyForDetail.retailer && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Retailer
                            </label>
                            <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg">
                              {selectedWarrantyForDetail.retailer}
                            </p>
                          </div>
                        )}

                        {selectedWarrantyForDetail.purchasePrice && (
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Purchase Price
                            </label>
                            <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg font-semibold">
                              {user?.preferences?.currency || "USD"}{" "}
                              {selectedWarrantyForDetail.purchasePrice?.toFixed(
                                2
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {selectedWarrantyForDetail.notes && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Notes
                        </label>
                        <p className="text-slate-900 text-base whitespace-pre-wrap bg-slate-50 p-3 rounded-lg">
                          {selectedWarrantyForDetail.notes}
                        </p>
                      </div>
                    )}

                    {/* Warranty Card Images */}
                    {selectedWarrantyForDetail.warrantyCardImages &&
                      selectedWarrantyForDetail.warrantyCardImages.length >
                        0 && (
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">
                            Warranty Card Images (
                            {
                              selectedWarrantyForDetail.warrantyCardImages
                                .length
                            }
                            )
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedWarrantyForDetail.warrantyCardImages.map(
                              (image, index) => (
                                <div
                                  key={image.publicId}
                                  className="relative group cursor-pointer"
                                  onClick={() =>
                                    handleViewImages(
                                      selectedWarrantyForDetail.warrantyCardImages ||
                                        [],
                                      index
                                    )
                                  }
                                >
                                  <img
                                    src={image.url}
                                    alt={`Warranty card ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border border-slate-200 group-hover:border-purple-300 transition-colors"
                                  />
                                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <div className="bg-white bg-opacity-90 rounded-full p-2">
                                        <Image className="w-4 h-4 text-slate-700" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => handleEdit(selectedWarrantyForDetail)}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-violet-600 text-white rounded-xl hover:from-purple-700 hover:to-violet-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Edit className="h-4 w-4" />
                      Edit Warranty
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(selectedWarrantyForDetail._id)
                      }
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 transition-all duration-200 flex items-center justify-center gap-2 text-sm font-semibold shadow-lg hover:shadow-xl"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Image Viewer Modal */}
      {showImageViewer && selectedImages.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90">
          <div className="relative max-w-4xl max-h-full p-4">
            {/* Close Button */}
            <button
              onClick={() => setShowImageViewer(false)}
              className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Navigation Buttons */}
            {selectedImages.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === 0 ? selectedImages.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={() =>
                    setCurrentImageIndex((prev) =>
                      prev === selectedImages.length - 1 ? 0 : prev + 1
                    )
                  }
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Image */}
            <img
              src={selectedImages[currentImageIndex]?.url}
              alt={`Warranty card ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain rounded-lg"
            />

            {/* Image Counter */}
            {selectedImages.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
                {currentImageIndex + 1} / {selectedImages.length}
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        message="Are you sure you want to delete this warranty? This action cannot be undone."
        onConfirm={() => confirmDelete(confirmModal.id)}
        onCancel={() => setConfirmModal({ open: false, id: "" })}
      />

      {/* QR Code Modal */}
      <WarrantyQRCodeModal
        isOpen={qrCodeModal.open}
        onClose={() =>
          setQrCodeModal({
            open: false,
            warrantyId: "",
            productName: "",
            warrantyInfo: {
              expirationDate: "",
              retailer: "",
              category: "",
            },
          })
        }
        warrantyId={qrCodeModal.warrantyId}
        productName={qrCodeModal.productName}
        warrantyInfo={qrCodeModal.warrantyInfo}
      />
    </div>
  );
};

export default Warranties;
