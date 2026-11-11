import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || "";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "";

export const isRazorpayConfigured = (): boolean => {
  return Boolean(keyId && keySecret && keyId !== "rzp_test_key");
};

// Singleton Razorpay client instance
let razorpayClient: Razorpay | null = null;

export function getRazorpayClient(): Razorpay | null {
  if (!isRazorpayConfigured()) {
    return null;
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpayClient;
}

export interface CreateOrderParams {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export async function createGatewayOrder(params: CreateOrderParams) {
  const client = getRazorpayClient();
  if (!client) {
    throw new Error("Razorpay credentials not configured on this server");
  }

  const order = await client.orders.create({
    amount: params.amountInPaise,
    currency: params.currency || "INR",
    receipt: params.receipt,
    notes: params.notes || {},
  });

  return order;
}

export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!keySecret) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSignature, "utf8");
  const providedBuf = Buffer.from(params.signature, "utf8");

  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

export async function refundGatewayPayment(paymentId: string, amountInPaise?: number) {
  const client = getRazorpayClient();
  if (!client) {
    throw new Error("Razorpay credentials not configured");
  }

  return client.payments.refund(paymentId, {
    ...(amountInPaise ? { amount: amountInPaise } : {}),
  });
}

