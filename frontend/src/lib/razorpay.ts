import type { CreatePaymentResult } from './endpoints/registration';

// Razorpay has no official React SDK — Checkout.js is loaded as a script tag
// even in React apps. Loaded lazily/once so pages that never touch payments
// don't pay for it.
let scriptPromise: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout script'));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface OpenCheckoutOptions {
  order: CreatePaymentResult;
  name: string; // shown in the checkout modal header
  description: string;
  prefill?: { name?: string; contact?: string };
  onSuccess: (result: RazorpaySuccess) => void;
  onDismiss?: () => void;
}

// The ONE place amount*100 (rupees -> paise) happens — createPayment's
// response is in rupees, Checkout.js's `amount` option wants paise.
//
// `test_mode: true` means RAZORPAY_KEY_ID is still a REPLACE_ME placeholder
// server-side (see backend-mysql/.env) — order.key_id/order_id aren't real
// Razorpay credentials, so actually invoking Checkout.js with them would
// fail outright. In that case, skip the real gateway and synthesize a
// successful result directly, mirroring what "test mode" is meant to do
// (let the registration flow be exercised end-to-end without live keys).
export async function openCheckout(opts: OpenCheckoutOptions): Promise<void> {
  if (opts.order.test_mode) {
    opts.onSuccess({
      razorpay_payment_id: `pay_test_${Date.now()}`,
      razorpay_order_id: opts.order.order_id,
      razorpay_signature: 'test_mode_no_signature',
    });
    return;
  }

  await loadCheckoutScript();

  const rzp = new window.Razorpay({
    key: opts.order.key_id,
    amount: opts.order.amount * 100,
    currency: opts.order.currency,
    order_id: opts.order.order_id,
    name: opts.name,
    description: opts.description,
    prefill: opts.prefill,
    handler: (response: RazorpaySuccess) => opts.onSuccess(response),
    modal: opts.onDismiss ? { ondismiss: opts.onDismiss } : undefined,
  });
  rzp.open();
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}
