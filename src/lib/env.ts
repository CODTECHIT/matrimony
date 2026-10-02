/**
 * Frontend runtime configuration.
 * Only values that are safe to expose publicly may live here.
 * See .env.example for the full list of variables.
 */
export const env = {
  apiBaseUrl: import.meta.env["VITE_API_BASE_URL"] ?? "",
  paymentPublicKey: import.meta.env["VITE_PAYMENT_PUBLIC_KEY"] ?? "",
  chatSocketUrl: import.meta.env["VITE_CHAT_SOCKET_URL"] ?? "",
  appName: import.meta.env["VITE_APP_NAME"] ?? "YFJ Matrimony",
  /**
   * Mock mode is opt-in for isolated unit testing only.
   * Defaults to false so live backend API is always used.
   */
  useMockApi: import.meta.env["VITE_USE_MOCK_API"] === "true",
} as const;
