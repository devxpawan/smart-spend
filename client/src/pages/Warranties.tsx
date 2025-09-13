import axios from "axios";
import { differenceInDays, format, isValid, parseISO } from "date-fns";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Edit,
  Edit3,
  Image,
  Package,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmModal from "../components/ConfirmModal";
import CustomSelect from "../components/CustomSelect";

import WarrantyModal from "../components/WarrantyModal";
import WarrantyQRCodeModal from "../components/WarrantyQRCodeModal";
import { useAuth } from "../contexts/AuthContext";
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
  isLifetimeWarranty?: boolean;
}

interface FilterConfig {
  category: string;
  status: string;
  searchTerm: string;
}

const statusOptions = [
  { value: "", label: "All Warranties" },
  { value: "false", label: "Active Only" },
  { value: "true", label: "Expired Only" },
];

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
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    id: "",
  });
  const [deletingId, setDeletingId] = useState<string | null>(null); // For individual delete
  const [isBulkDeleting, setIsBulkDeleting] = useState(false); // For bulk delete
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

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  const [userCategories, setUserCategories] = useState<string[]>([]);

  const [formData, setFormData] = useState<LocalWarrantyFormData>({
    productName: "",
    expirationDate: "",
    category: "", // Changed to empty string
    purchaseDate: "",
    retailer: "",
    notes: "",
    purchasePrice: undefined,
  });

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "All Categories" },
      ...userCategories.map((cat) => ({ value: cat, label: cat })),
    ],
    [userCategories]
  );

  const fetchUserCategories = useCallback(async () => {
    try {
      const response = await axios.get("/api/warranties/categories");
      setUserCategories(response.data);
    } catch (err) {
      console.error("Error fetching user categories:", err);
      // Optionally set an error state or default categories
    }
  }, []); // Empty dependency array means this runs once on mount

  // Fetch user-specific categories
  useEffect(() => {
    fetchUserCategories();
  }, [fetchUserCategories]);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Fetch warranties function
  const fetchWarranties = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await axios.get("/api/warranties");
      const data = Array.isArray(response.data)
        ? response.data
        : response.data.warranties;
      setWarranties(data || []);
    } catch (err: any) {
      console.error("Error fetching warranties:", err);
      if (err.response?.status === 401) {
        setError("You are not authorized. Please log in again.");
      } else {
        setError("Failed to load warranties. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Load warranties on component mount
  useEffect(() => {
    fetchWarranties();
  }, [fetchWarranties]);

  // Memoized filtered warranties and stats
  const { filteredWarranties, stats, paginatedWarranties, pageCount } =
    useMemo(() => {
      const filtered = warranties.filter((w) => {
        // Category filter
        if (filters.category && w.category !== filters.category) {
          return false;
        }

        // Status filter
        if (filters.status) {
          const isExpiredCheck =
            !w.isLifetimeWarranty && new Date(w.expirationDate) < new Date();
          if (filters.status === "false" && isExpiredCheck) {
            // Active only
            return false;
          }
          if (filters.status === "true" && !isExpiredCheck) {
            // Expired only
            return false;
          }
        }

        // Search term filter
        if (filters.searchTerm) {
          const searchLower = filters.searchTerm.toLowerCase();
          if (
            !w.productName.toLowerCase().includes(searchLower) &&
            !(w.notes && w.notes.toLowerCase().includes(searchLower)) &&
            !(w.retailer && w.retailer.toLowerCase().includes(searchLower))
          ) {
            return false;
          }
        }

        return true;
      });

      // Calculate stats based on the filtered data
      const now = new Date();
      const active = filtered.filter(
        (w) => w.isLifetimeWarranty || new Date(w.expirationDate) > now
      ).length;
      const expired = filtered.filter(
        (w) => !w.isLifetimeWarranty && new Date(w.expirationDate) <= now
      ).length;
      const expiringSoon = filtered.filter((w) => {
        if (w.isLifetimeWarranty) return false;
        const expDate = new Date(w.expirationDate);
        const daysUntilExpiry = differenceInDays(expDate, now);
        return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
      }).length;
      const totalValue = filtered.reduce(
        (sum, w) => sum + (w.purchasePrice || 0),
        0
      );

      const stats = {
        active,
        expired,
        expiringSoon,
        totalValue,
        total: filtered.length,
      };

      // Pagination logic
      const recordsPerPage = 12; // Adjust as needed
      const pageCount = Math.ceil(filtered.length / recordsPerPage);
      const indexOfLastRecord = currentPage * recordsPerPage;
      const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
      const paginatedWarranties = filtered.slice(
        indexOfFirstRecord,
        indexOfLastRecord
      );

      return {
        filteredWarranties: filtered,
        stats,
        paginatedWarranties,
        pageCount,
      };
    }, [warranties, filters, currentPage]);

  useEffect(() => {
    if (selectedWarrantyForDetail) {
      const updatedDetail = warranties.find(
        (w) => w._id === selectedWarrantyForDetail._id
      );
      setSelectedWarrantyForDetail(updatedDetail || null);
    }
  }, [warranties, selectedWarrantyForDetail?._id]);

  // Adjust current page if it becomes invalid after filtering or deletion
  useEffect(() => {
    if (pageCount === 0 && currentPage !== 1) {
      setCurrentPage(1); // If no records, ensure we are on page 1
    } else if (currentPage > pageCount && pageCount > 0) {
      setCurrentPage(pageCount); // If current page is out of bounds, go to the last valid page
    }
  }, [pageCount, currentPage]);

  // Utility functions
  const isExpired = useCallback(
    (expirationDate: string, isLifetimeWarranty?: boolean) => {
      if (isLifetimeWarranty) return false;
      return new Date(expirationDate) < new Date();
    },
    []
  );

  const isExpiringSoon = useCallback(
    (expirationDate: string, isLifetimeWarranty?: boolean) => {
      if (isLifetimeWarranty) return false;
      const expDate = new Date(expirationDate);
      const today = new Date();
      const daysUntilExpiry = differenceInDays(expDate, today);
      return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
    },
    []
  );

  const getDaysUntilExpiry = useCallback(
    (expirationDate: string, isLifetimeWarranty?: boolean) => {
      if (isLifetimeWarranty) return null;
      const expDate = new Date(expirationDate);
      const today = new Date();
      return differenceInDays(expDate, today);
    },
    []
  );

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
        isLifetimeWarranty: data.isLifetimeWarranty || false,
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

      await fetchWarranties();
      fetchUserCategories();

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
      category: "",
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
      expirationDate: warranty.expirationDate
        ? warranty.expirationDate.split("T")[0]
        : "",
      category: warranty.category,
      purchaseDate: warranty.purchaseDate
        ? warranty.purchaseDate.split("T")[0]
        : "",
      retailer: warranty.retailer || "",
      notes: warranty.notes || "",
      purchasePrice: warranty.purchasePrice || undefined,
      warrantyCardImages: warranty.warrantyCardImages || [],
      isLifetimeWarranty: warranty.isLifetimeWarranty || false,
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
    setDeletingId(id); // Set deleting state
    try {
      setLoading(true);
      setConfirmModal({ open: false, id: "" });
      await axios.delete(`/api/warranties/${id}`);
      await fetchWarranties();

      if (selectedWarrantyForDetail?._id === id) {
        setSelectedWarrantyForDetail(null);
        setIsDetailModalOpen(false);
      }
      setError(""); // Clear any previous error
    } catch (err: any) {
      console.error("Error deleting warranty:", err);
      setError("Failed to delete warranty. Please try again.");
    } finally {
      setLoading(false);
      setDeletingId(null); // Reset deleting state
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleFilterChange = (key: keyof FilterConfig, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const currentPageIds = paginatedWarranties.map((record) => record._id);
    if (e.target.checked) {
      setSelectedIds((prev) => [...new Set([...prev, ...currentPageIds])]);
    } else {
      setSelectedIds((prev) =>
        prev.filter((id) => !currentPageIds.includes(id))
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => axios.delete(`/api/warranties/${id}`))
      );
      await fetchWarranties();
      setSelectedIds([]);
      setError("");
    } catch (err) {
      setError("Failed to delete selected warranties");
    } finally {
      setIsBulkDeleteModalOpen(false);
      setIsBulkDeleting(false);
    }
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
                Manage your product warranties and coverage
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search warranties..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-slate-100 rounded-xl text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all duration-300 shadow-sm"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => handleFilterChange("searchTerm", "")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-full p-1"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
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
              <CustomSelect
                options={categoryOptions}
                value={filters.category}
                onChange={(value) => handleFilterChange("category", value)}
                className="w-full sm:w-72"
              />
            </div>

            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-xs sm:text-sm font-medium text-gray-700">
                Status:
              </label>
              <CustomSelect
                options={statusOptions}
                value={filters.status}
                onChange={(value) => handleFilterChange("status", value)}
                className="w-full sm:w-48"
              />
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
              onClick={() => fetchWarranties()}
              className="flex items-center justify-center px-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
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

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-100 p-3 sm:p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div className="text-sm font-medium text-slate-700">
              {selectedIds.length} item(s) selected
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isBulkDeleting}
              >
                {isBulkDeleting ? (
                  <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                ) : (
                  "Delete"
                )}
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warranties Table or Empty State */}
      <div className="relative min-h-[600px]">
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
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <div className="max-w-md mx-auto">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {warranties.length === 0 ? "No Warranties to Display" : "No Matching Warranties Found"}
              </h3>
              <p className="text-gray-600 mb-6">
                {warranties.length === 0
                  ? "It looks like you haven't added any warranties yet. Let's get started!"
                  : "Your current filters returned no results. Try broadening your search or adjusting the criteria."}
              </p>
              {/* Quick Tips Section */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4 text-left max-w-md mx-auto">
                <h4 className="text-base font-semibold text-purple-700 mb-2">Quick Tips</h4>
                <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700">
                  <li>Print and attach to product</li>
                  <li>Share with repair shops</li>
                  <li>Works on any smartphone</li>
                  <li>Download and print details</li>
                </ul>
              </div>
              <button
                onClick={() => {
                  resetFormData();
                  setIsAddModalOpen(true);
                }}
                className="inline-flex items-center px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 text-white hover:from-purple-700 hover:to-violet-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-sm font-semibold transform hover:scale-[1.02]"
              >
                <Plus className="mr-2 w-5 h-5" />
                Add New Warranty
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            {/* Mobile Card View */}
            <div className="block lg:hidden">
              <div className="divide-y divide-gray-200">
                {paginatedWarranties.map((warranty) => {
                  const daysUntilExpiry = getDaysUntilExpiry(
                    warranty.expirationDate,
                    warranty.isLifetimeWarranty
                  );
                  const expired = isExpired(
                    warranty.expirationDate,
                    warranty.isLifetimeWarranty
                  );
                  const expiringSoon = isExpiringSoon(
                    warranty.expirationDate,
                    warranty.isLifetimeWarranty
                  );

                  return (
                    <div
                      key={warranty._id}
                      className={`p-4 space-y-3 ${
                        selectedIds.includes(warranty._id) ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleSelect(warranty._id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mr-3"
                              checked={selectedIds.includes(warranty._id)}
                              onChange={() => handleSelect(warranty._id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(warranty);
                              }}
                              className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                            >
                              <span className="truncate">
                                {warranty.productName}
                              </span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                            </button>
                          </div>
                          <div className="mt-1 flex items-center space-x-2 ml-7">
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded font-medium">
                              {warranty.category}
                            </span>
                            {warranty.isLifetimeWarranty ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Lifetime
                              </span>
                            ) : expired ? (
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

                      <div className="grid grid-cols-2 gap-3 text-sm ml-7">
                        <div>
                          <div className="text-gray-600 text-xs">Expires:</div>
                          <div className="font-medium">
                            {warranty.isLifetimeWarranty ? (
                              <span className="text-green-600 font-semibold">
                                Lifetime
                              </span>
                            ) : (
                              formatDate(warranty.expirationDate)
                            )}
                          </div>
                          {warranty.isLifetimeWarranty ? (
                            <div className="text-xs text-green-600 font-medium">
                              Never expires
                            </div>
                          ) : (
                            !expired && (
                              <div className="text-xs text-gray-500">
                                {daysUntilExpiry && daysUntilExpiry > 0
                                  ? `${daysUntilExpiry} days left`
                                  : "Expires today"}
                              </div>
                            )
                          )}
                        </div>
                        <div>
                          <div className="text-gray-600 text-xs">Retailer:</div>
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

                      <div className="flex items-center justify-between pt-2 ml-7">
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

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(warranty._id);
                            }}
                            className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${deletingId === warranty._id ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Delete Warranty"
                            disabled={deletingId === warranty._id}
                          >
                            {deletingId === warranty._id ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
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
                    <th scope="col" className="p-4">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        onChange={handleSelectAll}
                        checked={
                          paginatedWarranties.length > 0 &&
                          paginatedWarranties.every((warranty) =>
                            selectedIds.includes(warranty._id)
                          )
                        }
                      />
                    </th>
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
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white/50 divide-y divide-slate-200">
                  {paginatedWarranties.map((warranty) => {
                    const daysUntilExpiry = getDaysUntilExpiry(
                      warranty.expirationDate,
                      warranty.isLifetimeWarranty
                    );
                    const expired = isExpired(
                      warranty.expirationDate,
                      warranty.isLifetimeWarranty
                    );
                    const expiringSoon = isExpiringSoon(
                      warranty.expirationDate,
                      warranty.isLifetimeWarranty
                    );

                    return (
                      <tr
                        key={warranty._id}
                        className={`hover:bg-gray-50 ${
                          selectedIds.includes(warranty._id) ? "bg-blue-50" : ""
                        }`}
                        onClick={() => handleSelect(warranty._id)}
                      >
                        <td className="p-4">
                          <input
                            type="checkbox"
                            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            checked={selectedIds.includes(warranty._id)}
                            onChange={() => handleSelect(warranty._id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg bg-gradient-to-r from-purple-500 to-violet-600 flex items-center justify-center mr-3 lg:mr-4 shadow-md">
                              <Package className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                            </div>
                            <div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(warranty);
                                }}
                                className="text-sm font-medium text-gray-900 hover:text-blue-600 flex items-center space-x-1 group"
                              >
                                <span>{warranty.productName}</span>
                                <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                              {warranty.purchasePrice && (
                                <div className="text-sm text-gray-600 font-medium mt-1 flex items-center">
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  {user?.preferences?.currency || "USD"}{" "}
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
                                {warranty.warrantyCardImages.length > 3 && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    +{warranty.warrantyCardImages.length - 3}{" "}
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
                                {warranty.isLifetimeWarranty ? (
                                  <span className="text-green-600 font-semibold">
                                    Lifetime
                                  </span>
                                ) : (
                                  formatDate(warranty.expirationDate)
                                )}
                              </div>
                              {warranty.isLifetimeWarranty ? (
                                <div className="text-xs text-green-600 font-medium">
                                  Never expires
                                </div>
                              ) : (
                                !expired && (
                                  <div className="text-xs text-slate-500">
                                    {daysUntilExpiry && daysUntilExpiry > 0
                                      ? `${daysUntilExpiry} days left`
                                      : "Expires today"}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                          {warranty.isLifetimeWarranty ? (
                            <span className="inline-flex items-center px-2 lg:px-3 py-1 lg:py-1.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 shadow-sm">
                              <ShieldCheck className="h-3 w-3 mr-1 lg:mr-1.5" />
                              Lifetime
                            </span>
                          ) : expired ? (
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
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(warranty._id);
                              }}
                              className={`text-rose-600 hover:text-white hover:bg-gradient-to-r hover:from-rose-500 hover:to-red-600 transition-all duration-200 p-2 rounded-lg hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-rose-500 ${deletingId === warranty._id ? 'opacity-60 cursor-not-allowed' : 'transform hover:scale-105'}`}
                              title="Delete Warranty"
                              disabled={deletingId === warranty._id}
                            >
                              {deletingId === warranty._id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
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
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {pageCount > 1 && (
        <nav className="flex justify-center mt-6 p-2 bg-white rounded-lg shadow-md">
          <ul className="flex items-center space-x-1 h-10 text-base">
            <li>
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Previous
              </button>
            </li>
            {/* Page numbers */}
            {(() => {
              const pageNumbers = [];
              const maxPagesToShow = 5; // Maximum number of page buttons to display
              const ellipsis = <li key="ellipsis" className="px-2 text-gray-500">...</li>;

              let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
              let endPage = Math.min(pageCount, startPage + maxPagesToShow - 1);

              if (endPage - startPage + 1 < maxPagesToShow) {
                startPage = Math.max(1, endPage - maxPagesToShow + 1);
              }

              if (startPage > 1) {
                pageNumbers.push(
                  <li key={1}>
                    <button
                      onClick={() => handlePageChange(1)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 ${
                        currentPage === 1
                          ? "text-white bg-purple-600 hover:bg-purple-700"
                          : "text-gray-700 bg-white hover:bg-gray-100"
                      }`}
                    >
                      1
                    </button>
                  </li>
                );
                if (startPage > 2) {
                  pageNumbers.push(ellipsis);
                }
              }

              for (let i = startPage; i <= endPage; i++) {
                pageNumbers.push(
                  <li key={i}>
                    <button
                      onClick={() => handlePageChange(i)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 ${
                        currentPage === i
                          ? "text-white bg-purple-600 hover:bg-purple-700"
                          : "text-gray-700 bg-white hover:bg-gray-100"
                      }`}
                    >
                      {i}
                    </button>
                  </li>
                );
              }

              if (endPage < pageCount) {
                if (endPage < pageCount - 1) {
                  pageNumbers.push(ellipsis);
                }
                pageNumbers.push(
                  <li key={pageCount}>
                    <button
                      onClick={() => handlePageChange(pageCount)}
                      className={`flex items-center justify-center px-4 h-10 font-semibold border border-gray-300 transition-colors duration-150 ${
                        currentPage === pageCount
                          ? "text-white bg-purple-600 hover:bg-purple-700"
                          : "text-gray-700 bg-white hover:bg-gray-100"
                      }`}
                    >
                      {pageCount}
                    </button>
                  </li>
                );
              }
              return pageNumbers;
            })()}
            <li>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="flex items-center justify-center px-4 h-10 font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                Next
              </button>
            </li>
          </ul>
        </nav>
      )}

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
                            {formatDate(selectedWarrantyForDetail.purchaseDate)}
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Expiration Date
                        </label>
                        <p className="text-slate-900 text-base bg-slate-50 p-3 rounded-lg">
                          {formatDate(selectedWarrantyForDetail.expirationDate)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Status
                      </label>
                      <div className="bg-slate-50 p-3 rounded-lg">
                        {selectedWarrantyForDetail.isLifetimeWarranty ? (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 border border-green-200">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Lifetime Warranty
                          </span>
                        ) : isExpired(
                            selectedWarrantyForDetail.expirationDate,
                            selectedWarrantyForDetail.isLifetimeWarranty
                          ) ? (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-800 border border-red-200">
                            <AlertCircle className="h-4 w-4 mr-2" />
                            Expired
                          </span>
                        ) : isExpiringSoon(
                            selectedWarrantyForDetail.expirationDate,
                            selectedWarrantyForDetail.isLifetimeWarranty
                          ) ? (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="h-4 w-4 mr-2" />
                            Expiring Soon (
                            {getDaysUntilExpiry(
                              selectedWarrantyForDetail.expirationDate,
                              selectedWarrantyForDetail.isLifetimeWarranty
                            )}{" "}
                            days left)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-2 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Active (
                            {getDaysUntilExpiry(
                              selectedWarrantyForDetail.expirationDate,
                              selectedWarrantyForDetail.isLifetimeWarranty
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

      <ConfirmModal
        isOpen={isBulkDeleteModalOpen}
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteModalOpen(false)}
        title="Delete Warranties?"
        message={`Are you sure you want to delete ${selectedIds.length} warranty(s)?`}
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
