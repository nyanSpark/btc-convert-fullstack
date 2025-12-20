export type SupportedCurrency = "USD" | "GBP" | "JPY";

export interface BtcApiResponse {
  input: {
    currency: SupportedCurrency;
    amount: string;
  };
  btc: {
    amount: string;
  };
  rate: {
    btcPerUnit: string;
    asOfUnix: number;
    source: string;
  };
  cache: {
    ttlSeconds: number;
    servedFrom: string;
    fetchedAtUnix: number;
  };
}

export interface ApiErrorResponse {
  error: {
    message: string;
    details?: string;
  };
}

export async function fetchBtcConversion(currency: SupportedCurrency, amount: string): Promise<BtcApiResponse> {
  const url = new URL("/api/btc", window.location.origin);
  url.searchParams.set("currency", currency);
  url.searchParams.set("amount", amount);

  const res = await fetch(url.toString(), { method: "GET" });

  const contentType = res.headers.get("content-type");
  const isJson = contentType != null && contentType.includes("application/json");

  if (!res.ok) {
    if (isJson) {
      const errJson = (await res.json()) as ApiErrorResponse;
      const msg = errJson?.error?.message;
      const details = errJson?.error?.details;

      if (typeof details === "string" && details.length > 0) {
        throw new Error(`${msg} (${details})`);
      }

      if (typeof msg === "string" && msg.length > 0) {
        throw new Error(msg);
      }
    }

    const text = await res.text();
    throw new Error(text || `Request failed with status ${res.status}`);
  }

  if (!isJson) {
    throw new Error("Unexpected response format from server.");
  }

  return (await res.json()) as BtcApiResponse;
}
