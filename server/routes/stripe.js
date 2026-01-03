import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import stripe, { PRICING_PLANS } from '../config/stripe.js';
import User from '../models/User.js';

const router = express.Router();

// Apply authentication middleware
router.use(authenticateToken);

// @route   POST /api/stripe/create-checkout-session
// @desc    Create a Stripe checkout session for subscription
// @access  Private
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { plan } = req.body;
    const userId = req.user.id;

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
      return res.status(503).json({ 
        message: 'Payment system is not configured. Please contact support or add your Stripe API key in server/.env file.',
        hint: 'Get your key from: https://dashboard.stripe.com/apikeys'
      });
    }

    // Validate plan
    if (!plan || !PRICING_PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already Pro
    if (user.isPro && user.subscription?.status === 'active') {
      return res.status(400).json({ message: 'You already have an active Pro subscription' });
    }

    const selectedPlan = PRICING_PLANS[plan];

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: selectedPlan.currency,
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: Math.round(selectedPlan.price * 100), // Convert to cents
            recurring: {
              interval: selectedPlan.interval,
            },
          },
          quantity: 1,
        },
      ],
      customer_email: user.email,
      client_reference_id: userId.toString(),
      metadata: {
        userId: userId.toString(),
        plan: plan,
      },
      success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/profile?session_id={CHECKOUT_SESSION_ID}&success=true`,
      cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/profile?canceled=true`,
    });

    res.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ message: 'Failed to create checkout session', error: error.message });
  }
});

// @route   POST /api/stripe/create-payment-intent
// @desc    Create a Stripe setup intent for trial subscription (validates card without charging)
// @access  Private
router.post('/create-payment-intent', async (req, res) => {
  try {
    const { plan, country } = req.body;
    const userId = req.user.id;

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'your_stripe_secret_key_here') {
      return res.status(503).json({ 
        message: 'Payment system is not configured. Please contact support or add your Stripe API key in server/.env file.',
        hint: 'Get your key from: https://dashboard.stripe.com/apikeys'
      });
    }

    // Validate plan
    if (!plan || !PRICING_PLANS[plan]) {
      return res.status(400).json({ message: 'Invalid plan selected' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already Pro
    if (user.isPro && user.subscription?.status === 'active') {
      return res.status(400).json({ message: 'You already have an active Pro subscription' });
    }

    const selectedPlan = PRICING_PLANS[plan];

    // Create or get customer
    let customerId = user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: userId.toString(),
        },
      });
      customerId = customer.id;
    }

    // Create a SetupIntent to save payment method for future use (no charge)
    // This validates the card without charging anything
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        userId: userId.toString(),
        plan: plan,
        country: country || 'US',
      },
      description: `SmartSpend Pro ${plan} subscription - Card validation for 7-day trial`,
    });

    res.json({ 
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
      customerId: customerId
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
  }
});

// @route   POST /api/stripe/confirm-payment
// @desc    Confirm setup intent and upgrade user to Pro with trial subscription
// @access  Private
router.post('/confirm-payment', async (req, res) => {
  try {
    const { setupIntentId, paymentMethodId } = req.body;
    const userId = req.user.id;

    console.log('Confirm payment request:', { setupIntentId, paymentMethodId, userId });

    if (!setupIntentId) {
      return res.status(400).json({ message: 'Setup intent ID is required' });
    }

    // Retrieve setup intent to verify it succeeded
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
    console.log('SetupIntent status:', setupIntent.status);

    if (setupIntent.status !== 'succeeded') {
      return res.status(400).json({ 
        message: 'Card validation not completed', 
        status: setupIntent.status 
      });
    }

    // Verify userId matches
    if (setupIntent.metadata.userId !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized payment confirmation' });
    }

    // Update user to Pro
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get the payment method from the setup intent
    const paymentMethod = setupIntent.payment_method || paymentMethodId;
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Payment method not found' });
    }

    console.log('Payment method:', paymentMethod);

    // Get customer ID
    const customerId = setupIntent.customer;
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID not found in setup intent' });
    }

    console.log('Customer ID:', customerId);

    // Create subscription for future billing (after trial)
    const selectedPlan = PRICING_PLANS[setupIntent.metadata.plan];
    if (!selectedPlan) {
      return res.status(400).json({ message: 'Invalid plan in setup intent metadata' });
    }

    console.log('Creating subscription with plan:', selectedPlan);

    // For subscription creation, we need to use a predefined price ID
    // Create a product and price for this plan
    const product = await stripe.products.create({
      name: selectedPlan.name,
      description: selectedPlan.description,
      metadata: {
        plan_id: selectedPlan.id,
      },
    });
    
    const price = await stripe.prices.create({
      unit_amount: Math.round(selectedPlan.price * 100),
      currency: selectedPlan.currency,
      recurring: {
        interval: selectedPlan.interval,
      },
      product: product.id,
    });

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [
        {
          price: price.id,
        },
      ],
      default_payment_method: paymentMethod,
      trial_period_days: 7, // 7-day trial
      metadata: {
        userId: userId.toString(),
        plan: setupIntent.metadata.plan,
      },
    });

    console.log('Subscription created:', subscription.id);

    user.isPro = true;
    user.subscription = {
      plan: setupIntent.metadata.plan,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      status: 'trialing',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await user.save();

    console.log('User upgraded to Pro:', user._id);

    res.json({ 
      message: 'Successfully upgraded to Pro!',
      user: {
        id: user._id,
        email: user.email,
        isPro: user.isPro,
        subscription: user.subscription,
      }
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: 'Failed to confirm payment', 
      error: error.message,
      details: error.raw?.message || 'No additional details available'
    });
  }
});

// @route   GET /api/stripe/session/:sessionId
// @desc    Get checkout session details
// @access  Private
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    res.json({
      status: session.payment_status,
      customerEmail: session.customer_email,
    });
  } catch (error) {
    console.error('Error retrieving session:', error);
    res.status(500).json({ message: 'Failed to retrieve session' });
  }
});

// @route   POST /api/stripe/cancel-subscription
// @desc    Cancel user's subscription
// @access  Private
router.post('/cancel-subscription', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.subscription?.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription found' });
    }

    // Cancel the subscription at period end
    await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    user.subscription.status = 'canceled';
    await user.save();

    res.json({ message: 'Subscription will be canceled at the end of the billing period', user });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

export default router;
