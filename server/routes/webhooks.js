import express from 'express';
import stripe from '../config/stripe.js';
import User from '../models/User.js';

const router = express.Router();

// @route   POST /api/webhooks/stripe
// @desc    Handle Stripe webhook events
// @access  Public (but verified by Stripe signature)
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        await handleCheckoutSessionCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
});

// Helper function to handle successful checkout
async function handleCheckoutSessionCompleted(session) {
  const userId = session.metadata.userId;
  const plan = session.metadata.plan;

  if (!userId || !plan) {
    console.error('Missing metadata in checkout session');
    return;
  }

  // Retrieve the subscription
  const subscription = await stripe.subscriptions.retrieve(session.subscription);

  // Update user in database
  const user = await User.findById(userId);
  if (!user) {
    console.error('User not found:', userId);
    return;
  }

  user.isPro = true;
  user.subscription = {
    plan: plan,
    stripeCustomerId: session.customer,
    stripeSubscriptionId: session.subscription,
    status: 'active',
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  };

  await user.save();
  console.log(`User ${userId} upgraded to Pro with ${plan} plan`);
}

// Helper function to handle subscription updates
async function handleSubscriptionUpdated(subscription) {
  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  
  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  user.subscription.status = subscription.status; // Keep original status (trialing, active, etc.)
  user.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
  user.isPro = ['active', 'trialing'].includes(subscription.status); // Pro during trial and active

  await user.save();
  console.log(`Subscription ${subscription.id} updated for user ${user._id}. Status: ${subscription.status}`);
}

// Helper function to handle subscription deletion
async function handleSubscriptionDeleted(subscription) {
  const user = await User.findOne({ 'subscription.stripeSubscriptionId': subscription.id });
  
  if (!user) {
    console.error('User not found for subscription:', subscription.id);
    return;
  }

  user.isPro = false;
  user.subscription.status = 'expired';

  await user.save();
  console.log(`Subscription ${subscription.id} deleted for user ${user._id}`);
}

// Helper function to handle payment failures
async function handlePaymentFailed(invoice) {
  const user = await User.findOne({ 'subscription.stripeCustomerId': invoice.customer });
  
  if (!user) {
    console.error('User not found for customer:', invoice.customer);
    return;
  }

  // Optionally send notification to user about payment failure
  console.log(`Payment failed for user ${user._id}`);
}

export default router;
