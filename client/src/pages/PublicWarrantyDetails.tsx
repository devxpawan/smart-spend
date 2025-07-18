import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ShieldCheck,
  Calendar,
  Package,
  Store,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { format, parseISO } from "date-fns";

interface PublicWarrantyData {
  id: string;
  productName: string;
  purchaseDate: string;
  expirationDate: string;
  retailer: string;
  category: string;
  notes: string;
  createdAt: string;
  isExpired: boolean;
  daysUntilExpiry: number;
}

const PublicWarrantyDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [warranty, setWarranty] = useState<PublicWarrantyData | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWarrantyDetails = async () => {
      if (!id) {
        setError("Invalid warranty ID");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/warranties/public/${id}`
        );
        setWarranty(response.data);
      } catch (err: any) {
        console.error("Error fetching warranty details:", err);
        if (err.response?.status === 404) {
          setError("Warranty not found");
        } else {
          setError("Failed to load warranty details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchWarrantyDetails();
  }, [id]);

  const getStatusColor = (isExpired: boolean, daysUntilExpiry: number) => {
    if (isExpired) return "text-red-600 bg-red-50";
    if (daysUntilExpiry <= 30) return "text-orange-600 bg-orange-50";
    return "text-green-600 bg-green-50";
  };

  const getStatusIcon = (isExpired: boolean, daysUntilExpiry: number) => {
    if (isExpired) return <AlertCircle className="w-5 h-5" />;
    if (daysUntilExpiry <= 30) return <Clock className="w-5 h-5" />;
    return <CheckCircle className="w-5 h-5" />;
  };

  const getStatusText = (isExpired: boolean, daysUntilExpiry: number) => {
    if (isExpired) return "Expired";
    if (daysUntilExpiry <= 0) return "Expires today";
    if (daysUntilExpiry === 1) return "Expires tomorrow";
    if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry} days`;
    return "Active";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading warranty details...</p>
        </div>
      </div>
    );
  }

  if (error || !warranty) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || "Warranty Not Found"}
          </h1>
          <p className="text-gray-600 mb-6">
            The warranty you're looking for could not be found or may have
            been removed.
          </p>
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Warranty Details
                </h1>
                <p className="text-gray-600">
                  Public warranty information
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Visit SmartSpend
            </button>
          </div>
        </div>
      </div>

      {/* Warranty Details */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          {/* Status Banner */}
          <div
            className={`px-6 py-4 border-b ${getStatusColor(
              warranty.isExpired,
              warranty.daysUntilExpiry
            )}`}
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(warranty.isExpired, warranty.daysUntilExpiry)}
              <div>
                <p className="font-semibold">
                  {getStatusText(
                    warranty.isExpired,
                    warranty.daysUntilExpiry
                  )}
                </p>
                {!warranty.isExpired && warranty.daysUntilExpiry <= 30 && (
                  <p className="text-sm opacity-75">
                    Consider renewing or extending your warranty soon
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Product Information */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Details */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Package className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Product
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {warranty.productName}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Store className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Retailer
                    </p>
                    <p className="text-gray-900">
                      {warranty.retailer || "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Category
                    </p>
                    <p className="text-gray-900">{warranty.category}</p>
                  </div>
                </div>
              </div>

              {/* Date Information */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Purchase Date
                    </p>
                    <p className="text-gray-900">
                      {warranty.purchaseDate
                        ? format(parseISO(warranty.purchaseDate), "PPP")
                        : "Not specified"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Warranty Expires
                    </p>
                    <p className="text-gray-900">
                      {format(parseISO(warranty.expirationDate), "PPP")}
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-gray-400 mt-1" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Added to System
                    </p>
                    <p className="text-gray-900">
                      {format(parseISO(warranty.createdAt), "PPP")}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {warranty.notes && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Notes
                </h3>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {warranty.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            This warranty information is provided via QR code access.
            <br />
            For full warranty management features,{" "}
            <button
              onClick={() => navigate("/")}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              visit SmartSpend
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicWarrantyDetails;
