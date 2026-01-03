import { AnimatePresence, motion } from "framer-motion";
import { Check, Crown, Loader2, X, Zap, CreditCard, Lock, AlertCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { useTheme } from "../contexts/theme-exports";

// Load Stripe outside of component to avoid recreating on each render
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Log Stripe key status for debugging (will be removed in production)
if (import.meta.env.DEV) {
  if (!import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 
      import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY === 'your_stripe_publishable_key_here') {
    console.error('⚠️ STRIPE ERROR: Publishable key not configured in client/.env');
    console.error('Please add: VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...');
  } else {
    console.log('✅ Stripe publishable key loaded successfully');
  }
}

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PLANS = {
  monthly: {
    id: "monthly",
    name: "SmartSpend Pro",
    price: 5.0,
    interval: "month",
    description: "Billed monthly",
    features: [
      "Smart Receipt Scanner",
      "Unlimited expenses & incomes",
      "Advanced analytics",
      "Priority support",
    ],
  },
  yearly: {
    id: "yearly",
    name: "SmartSpend Pro",
    price: 12.0,
    interval: "year",
    description: "Billed annually - Save $48!",
    badge: "Best Value",
    features: [
      "Smart Receipt Scanner",
      "Unlimited expenses & incomes",
      "Advanced analytics",
      "Priority support",
      "80% discount vs monthly",
    ],
  },
};

// Stripe Elements styling - now a function to support theme switching
const getCardElementOptions = (isDark: boolean) => ({
  style: {
    base: {
      color: isDark ? '#f9fafb' : '#1f2937',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: isDark ? '#6b7280' : '#9ca3af',
      },
    },
    invalid: {
      color: '#ef4444',
      iconColor: '#ef4444',
    },
  },
});

// Payment Form Component (uses Stripe Elements hooks)
const PaymentForm: React.FC<{
  selectedPlan: "monthly" | "yearly";
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ selectedPlan, onSuccess, onCancel }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [country, setCountry] = useState("US");
  const [error, setError] = useState<string | null>(null);

  const isDarkMode = theme === 'dark';
  const cardElementOptions = getCardElementOptions(isDarkMode);

  // Update Stripe Elements when theme changes
  useEffect(() => {
    if (elements) {
      const cardNumber = elements.getElement(CardNumberElement);
      const cardExpiry = elements.getElement(CardExpiryElement);
      const cardCvc = elements.getElement(CardCvcElement);
      
      // Update styling for all elements
      if (cardNumber) cardNumber.update(cardElementOptions);
      if (cardExpiry) cardExpiry.update(cardElementOptions);
      if (cardCvc) cardCvc.update(cardElementOptions);
    }
  }, [theme, elements, cardElementOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      return;
    }

    setLoading(true);

    try {
      // Create setup intent on backend (validates card without charging)
      const { data } = await axios.post("/api/stripe/create-payment-intent", {
        plan: selectedPlan,
        country,
      });

      const { clientSecret } = data;

      // Confirm card setup with Stripe (validates card, no charge)
      const cardElement = elements.getElement(CardNumberElement);
      if (!cardElement) {
        throw new Error("Card element not found");
      }

      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(
        clientSecret,
        {
          payment_method: {
            card: cardElement,
          },
        }
      );

      if (stripeError) {
        const errorMessage = stripeError.message || "Payment failed";
        setError(errorMessage);
        toast.error(errorMessage, { duration: 5000 });
      } else if (setupIntent.status === "succeeded") {
        // Notify backend about successful card validation and create trial subscription
        await axios.post("/api/stripe/confirm-payment", {
          setupIntentId: setupIntent.id,
          paymentMethodId: setupIntent.payment_method,
        });

        toast.success("Welcome to Pro! Your 7-day trial has started.");
        onSuccess();
        
        // Reload to update user state
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    } catch (err: any) {
      console.error("Payment error:", err);
      console.error("Error response:", err.response?.data);
      
      let errorMessage = "Payment failed. Please try again.";
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // Add additional details if available
        if (err.response.data.details) {
          errorMessage += ` (${err.response.data.details})`;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];
  const trialPrice = 0;
  const recurringPrice = plan.price;
  const billingInterval = selectedPlan === "yearly" ? "year" : "quarter";
  const billingDisplay = selectedPlan === "yearly" ? "Annually" : "Quarterly";

  return (
    <div className="flex flex-col md:flex-row min-h-[600px] bg-white dark:bg-gray-900">
      {/* Left Side - Order Summary */}
      <aside className="md:w-2/5 bg-gray-50 dark:bg-gray-800 p-8 border-r border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
          Your order summary
        </h2>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Plan</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {plan.name}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Billing</span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {billingDisplay}
            </span>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-6">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              Today's order
            </span>
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${trialPrice.toFixed(2)} USD
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ${recurringPrice.toFixed(2)}/{billingInterval} charged after 7-day trial
          </p>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            How your trial works
          </h3>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Today</p>
              <p className="text-gray-600 dark:text-gray-400">
                Your full access Pro plan trial is unlocked.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Day 5</p>
              <p className="text-gray-600 dark:text-gray-400">
                We'll send an end-of-trial email reminder.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 flex-shrink-0"></div>
            <div className="text-sm">
              <p className="font-semibold text-gray-900 dark:text-white">Day 7</p>
              <p className="text-gray-600 dark:text-gray-400">
                Your paid subscription begins unless you cancel beforehand.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Right Side - Payment Details */}
      <section className="md:w-3/5 p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Enter your payment details
        </h1>

        {/* Show loading state while Stripe is initializing */}
        {!stripe && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Loading payment form...</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                If this takes too long, please check your internet connection or try refreshing.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={`space-y-6 ${!stripe ? 'opacity-0 h-0 overflow-hidden' : ''}`}>
          {/* Payment Method Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              className="flex-1 px-4 py-3 text-sm font-medium border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Credit or debit card
            </button>
            <button
              type="button"
              disabled
              className="flex-1 px-4 py-3 text-sm font-medium border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400 rounded-lg cursor-not-allowed"
            >
              PayPal (Coming Soon)
            </button>
          </div>

          {/* Card Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credit or debit card number
            </label>
            <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
              <CardNumberElement options={cardElementOptions} />
            </div>
          </div>

          {/* Expiry and CVC */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Expiration date
              </label>
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                <CardExpiryElement options={cardElementOptions} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Security code (CVV)
              </label>
              <div className="border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800">
                <CardCvcElement options={cardElementOptions} />
              </div>
            </div>
          </div>

          {/* Country/Region */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Country/region
            </label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full border-2 border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="CA">Canada</option>
              <option value="AU">Australia</option>
              <option value="IN">India</option>
              <option value="LK">Sri Lanka</option>
              <option value="DE">Germany</option>
              <option value="FR">France</option>
              <option value="JP">Japan</option>
            </select>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                    Payment Failed
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400 mb-2">{error}</p>
                  <p className="text-xs text-red-500 dark:text-red-400">
                    💡 <strong>Using test mode?</strong> Try card: 4242 4242 4242 4242 with any future date and CVV 123
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold py-4 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-5 h-5" />
                Start free trial
              </>
            )}
          </button>

          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white font-medium py-2 transition-colors"
          >
            Cancel
          </button>

          {/* Terms */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By continuing you agree to be charged after your trial unless you cancel.
          </p>
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            Secure payment powered by Stripe
          </p>
        </form>
      </section>
    </div>
  );
};

const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("yearly");
  const [showPaymentForm, setShowPaymentForm] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowPaymentForm(false);
    }
  }, [isOpen]);

  const handleContinueToPayment = () => {
    setShowPaymentForm(true);
  };

  const handleBackToPlanSelection = () => {
    setShowPaymentForm(false);
  };

  const handlePaymentSuccess = () => {
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-6xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Conditional Rendering: Plan Selection or Payment Form */}
            {!showPaymentForm ? (
              <>
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 p-8 text-center text-white">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
                    <Crown className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold mb-2">Upgrade to Pro</h2>
                  <p className="text-yellow-100">
                    Unlock all premium features and supercharge your finance tracking
                  </p>
                </div>

                {/* Pricing Plans */}
                <div className="p-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Monthly Plan */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPlan("monthly")}
                      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPlan === "monthly"
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Monthly Pro
                        </h3>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === "monthly"
                              ? "border-yellow-500 bg-yellow-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedPlan === "monthly" && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${PLANS.monthly.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          /{PLANS.monthly.interval}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {PLANS.monthly.description}
                      </p>
                      <ul className="space-y-2">
                        {PLANS.monthly.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.div>

                    {/* Yearly Plan */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedPlan("yearly")}
                      className={`relative p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedPlan === "yearly"
                          ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                          : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {PLANS.yearly.badge && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-400 to-green-600 text-white shadow-lg">
                            <Zap className="w-3 h-3 mr-1" />
                            {PLANS.yearly.badge}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Yearly Pro
                        </h3>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedPlan === "yearly"
                              ? "border-yellow-500 bg-yellow-500"
                              : "border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {selectedPlan === "yearly" && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-gray-900 dark:text-white">
                          ${PLANS.yearly.price}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          /{PLANS.yearly.interval}
                        </span>
                      </div>
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold mb-4">
                        {PLANS.yearly.description}
                      </p>
                      <ul className="space-y-2">
                        {PLANS.yearly.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-center text-sm text-gray-700 dark:text-gray-300"
                          >
                            <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <button
                      onClick={onClose}
                      className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 font-semibold border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleContinueToPayment}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      <Crown className="w-5 h-5" />
                      Continue to Payment
                    </button>
                  </div>

                  {/* Security Note */}
                  <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                    🔒 Secure payment powered by Stripe. Cancel anytime.
                  </p>
                </div>
              </>
            ) : (
              /* Payment Form wrapped in Stripe Elements */
              <Elements stripe={stripePromise}>
                <PaymentForm
                  selectedPlan={selectedPlan}
                  onSuccess={handlePaymentSuccess}
                  onCancel={handleBackToPlanSelection}
                />
              </Elements>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default PricingModal;
