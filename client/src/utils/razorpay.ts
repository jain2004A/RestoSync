import { apiClient } from '../services/api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

let scriptLoadingPromise: Promise<boolean> | null = null;

export const loadRazorpayScript = (): Promise<boolean> => {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error('Failed to load Razorpay Checkout SDK');
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptLoadingPromise;
};

export const getRazorpayKeyId = async (): Promise<string> => {
  // Check client environment variable first
  const envKey = import.meta.env.VITE_RAZORPAY_KEY_ID;
  if (envKey && envKey !== 'rzp_test_placeholder') {
    return envKey;
  }

  // Fallback to backend config
  try {
    const res = await apiClient.get<{ success: boolean; keyId: string }>('/payments/config');
    if (res.data?.success && res.data.keyId) {
      return res.data.keyId;
    }
  } catch (err) {
    console.warn('Could not fetch Razorpay config from backend', err);
  }

  return 'rzp_test_T2ddslG9ywkskj';
};

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key?: string;
  amount: number; // in paise
  currency?: string;
  name?: string;
  description?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  handler: (response: RazorpaySuccessResponse) => void | Promise<void>;
  onDismiss?: () => void;
}

export const openRazorpayModal = async (options: RazorpayOptions): Promise<void> => {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error('Razorpay payment gateway failed to initialize. Please check your internet connection.');
  }

  const keyId = options.key || (await getRazorpayKeyId());

  const rzp = new window.Razorpay({
    key: keyId,
    amount: options.amount,
    currency: options.currency || 'INR',
    name: options.name || 'QuantroBill POS',
    description: options.description || 'Secure Online Payment',
    order_id: options.order_id,
    prefill: options.prefill || {},
    notes: options.notes || {},
    theme: options.theme || { color: '#2563eb' },
    handler: options.handler,
    modal: {
      ondismiss: () => {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
    },
  });

  rzp.open();
};
