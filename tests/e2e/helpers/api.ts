const BASE_URL = process.env.TEST_API_URL || "http://localhost:5000/api";
const DEFAULT_TIMEOUT_MS = Number(process.env.TEST_TIMEOUT_MS) || 5000;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: any;
  token?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
  headers: Headers;
  rawText: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const { method = "GET", body, token, timeoutMs = DEFAULT_TIMEOUT_MS, headers = {} } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : `${BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;

  const reqHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    reqHeaders["Content-Type"] = "application/json";
  }

  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: reqHeaders,
      body: body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });

    const rawText = await res.text();
    let data: any = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = rawText;
    }

    return {
      status: res.status,
      ok: res.ok,
      data,
      headers: res.headers,
      rawText,
    };
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
