import { toast } from "sonner";

export interface RazorpayPaymentSuccess {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amountInr: number;
  orderId?: string;
  planName: string;
  description?: string;
  user?: {
    fullName?: string;
    email?: string;
    mobile?: string;
  };
  onSuccess: (result: RazorpayPaymentSuccess) => void | Promise<void>;
  onDismiss?: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadRazorpayScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);

  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export async function openRazorpayCheckout(options: RazorpayCheckoutOptions): Promise<boolean> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    toast.error("Unable to load Razorpay payment gateway. Please check your internet connection.");
    return false;
  }

  const razorpayOptions = {
    key: options.key,
    amount: Math.round(options.amountInr * 100), // Amount in paise
    currency: "INR",
    name: "YFJ Matrimony",
    description: options.description || `${options.planName} Membership Plan`,
    image: "/logo.png",
    order_id: options.orderId || undefined,
    prefill: {
      name: options.user?.fullName || "",
      email: options.user?.email || "",
      contact: options.user?.mobile?.replace(/\D/g, "") || "",
    },
    theme: {
      color: "#E11D48",
    },
    handler: async (response: RazorpayPaymentSuccess) => {
      try {
        await options.onSuccess(response);
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Payment verification failed");
      }
    },
    modal: {
      ondismiss: () => {
        options.onDismiss?.();
      },
    },
  };

  try {
    const instance = new window.Razorpay(razorpayOptions);
    instance.open();
    return true;
  } catch (err: unknown) {
    console.error("Error opening Razorpay checkout:", err);
    toast.error("Could not initiate payment. Please try again.");
    return false;
  }
}
