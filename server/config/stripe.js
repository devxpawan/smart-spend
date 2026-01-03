import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

// Check if Stripe key is configured
if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
  console.warn('⚠️  WARNING: STRIPE_SECRET_KEY is not configured in .env file!');
  console.warn('⚠️  Payment features will not work until you add your Stripe API key.');
  console.warn('⚠️  Get your key from: https://dashboard.stripe.com/apikeys');
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

// Pricing plans
export const PRICING_PLANS = {
  monthly: {
    id: 'monthly',
    name: 'Monthly Pro',
    price: 5.00,
    currency: 'usd',
    interval: 'month',
    description: 'Billed monthly',
    features: [
      'Smart Receipt Scanner',
      'Unlimited expenses & incomes',
      'Advanced analytics',
      'Priority support',
    ],
  },
  yearly: {
    id: 'yearly',
    name: 'Yearly Pro',
    price: 12.00,
    currency: 'usd',
    interval: 'year',
    description: 'Billed annually - Save $48!',
    features: [
      'Smart Receipt Scanner',
      'Unlimited expenses & incomes',
      'Advanced analytics',
      'Priority support',
      '80% discount vs monthly',
    ],
  },
};

export default stripe;
