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
// @desc    Create a Stripe payment intent for embedded payment form
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

    // Create a PaymentIntent for the trial (initial charge of $0 for trial)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: 0, // $0 for trial period
      currency: selectedPlan.currency,
      metadata: {
        userId: userId.toString(),
        plan: plan,
        country: country || 'US',
      },
      description: `SmartSpend Pro ${plan} subscription - 7-day trial`,
    });

    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id 
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ message: 'Failed to create payment intent', error: error.message });
  }
});

// @route   POST /api/stripe/confirm-payment
// @desc    Confirm payment and upgrade user to Pro
// @access  Private
router.post('/confirm-payment', async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const userId = req.user.id;

    if (!paymentIntentId) {
      return res.status(400).json({ message: 'Payment intent ID is required' });
    }

    // Retrieve payment intent to verify it succeeded
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ message: 'Payment not completed' });
    }

    // Verify userId matches
    if (paymentIntent.metadata.userId !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized payment confirmation' });
    }

    // Update user to Pro
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create subscription for future billing (after trial)
    const selectedPlan = PRICING_PLANS[paymentIntent.metadata.plan];
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        userId: userId.toString(),
      },
    });

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price_data: {
            currency: selectedPlan.currency,
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: Math.round(selectedPlan.price * 100),
            recurring: {
              interval: selectedPlan.interval,
            },
          },
        },
      ],
      trial_period_days: 7, // 7-day trial
      metadata: {
        userId: userId.toString(),
        plan: paymentIntent.metadata.plan,
      },
    });

    user.isPro = true;
    user.subscription = {
      plan: paymentIntent.metadata.plan,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      status: 'trialing',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    };

    await user.save();

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
    res.status(500).json({ message: 'Failed to confirm payment', error: error.message });
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
