/**
 * Frontend runtime configuration.
 * Only values that are safe to expose publicly may live here.
 * See .env.example for the full list of variables.
 */
export const env = {
  apiBaseUrl: import.meta.env["VITE_API_BASE_URL"] ?? "",
  googleClientId: import.meta.env["VITE_GOOGLE_CLIENT_ID"] ?? "",
  paymentPublicKey: import.meta.env["VITE_PAYMENT_PUBLIC_KEY"] ?? "",
  chatSocketUrl: import.meta.env["VITE_CHAT_SOCKET_URL"] ?? "",
  appName: import.meta.env["VITE_APP_NAME"] ?? "YFJ Matrimony",
  /**
   * Mock mode keeps the UI fully browsable before the backend exists.
   * It turns off automatically as soon as VITE_USE_MOCK_API is "false".
   */
  useMockApi: (import.meta.env["VITE_USE_MOCK_API"] ?? "true") !== "false",
} as const;
