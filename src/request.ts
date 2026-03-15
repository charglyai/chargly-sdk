import { CharglyError } from "./errors";
import type { CharglyApiError } from "./types";

const DEFAULT_BASE_URL = "https://api.chargly.ai";

export interface RequestOptions {
  apiKey: string;
  baseUrl?: string;
  method: "GET" | "POST";
  path: string;
  body?: unknown;
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const base = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const url = `${base}${options.path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": options.apiKey,
  };

  const init: RequestInit = {
    method: options.method,
    headers,
  };

  if (options.body !== undefined && options.method === "POST") {
    init.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    let body: CharglyApiError | string;
    const text = await res.text();
    try {
      body = text ? (JSON.parse(text) as CharglyApiError) : { error: { message: res.statusText } };
    } catch {
      body = text || res.statusText;
    }
    throw CharglyError.fromResponse(res.status, body);
  }

  const text = await res.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new CharglyError("Invalid JSON response", { raw: text });
  }
}
