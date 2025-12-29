import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
let stripeClient = null;
if (stripeSecretKey) {
  stripeClient = new Stripe(stripeSecretKey);
}

export const getStripeClient = () => {
  if (!stripeClient) {
    const err = new Error('Stripe secret key is not configured');
    err.name = 'StripeConfigError';
    err.status = 500;
    throw err;
  }
  return stripeClient;
};
