export type SupportedCurrency = "USD" | "GBP" | "JPY";

export type ServedFrom = "memory" | "upstream";

export interface LiveRates {
  base: string;
  timestamp: number;
  rates: Record<string, number>;
}

export interface CacheInfo {
  ttlSeconds: number;
  servedFrom: ServedFrom;
  fetchedAtUnix: number;
}

export interface BtcResponse {
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
    source: "exchangerate.host";
  };
  cache: CacheInfo;
}

export interface ApiErrorResponse {
  error: {
    message: string;
    details?: string;
  };
}
