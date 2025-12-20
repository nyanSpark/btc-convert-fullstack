import Decimal from "decimal.js";
import type { LiveRates, SupportedCurrency } from "./types";

/**
 * exchangerate.host /live endpoint notes (FREE PLAN):
 * - Uses `source` instead of `base`
 * - Uses `quotes` instead of `rates`
 * - Quote keys are like: USDBTC, USDGBP, USDJPY
 */

const UPSTREAM_URL = "https://api.exchangerate.host/live";

// 30 minutes in-memory cache (best-effort, per warm lambda)
const MEMORY_TTL_SECONDS = 30 * 60;

type CachedRates = {
  fetchedAtUnix: number;
  expiresAtUnix: number;
  live: LiveRates;
};

let cached: CachedRates | null = null;

export async function getBtcPerUnit(
  currency: SupportedCurrency,
  accessKey: string
): Promise<{
  btcPerUnit: Decimal;
  asOfUnix: number;
  servedFrom: "memory" | "upstream";
  fetchedAtUnix: number;
  ttlSeconds: number;
}> {
  const nowUnix = Math.floor(Date.now() / 1000);

  const usableCache = getUsableCache(nowUnix);
  if (usableCache != null) {
    const btcPerUnit = deriveBtcPerUnit(currency, usableCache.live);

    return {
      btcPerUnit,
      asOfUnix: usableCache.live.timestamp,
      servedFrom: "memory",
      fetchedAtUnix: usableCache.fetchedAtUnix,
      ttlSeconds: Math.max(0, usableCache.expiresAtUnix - nowUnix)
    };
  }

  const live = await fetchLiveRates(accessKey);

  const fetchedAtUnix = Math.floor(Date.now() / 1000);
  const expiresAtUnix = fetchedAtUnix + MEMORY_TTL_SECONDS;

  cached = {
    fetchedAtUnix,
    expiresAtUnix,
    live
  };

  const btcPerUnit = deriveBtcPerUnit(currency, live);

  return {
    btcPerUnit,
    asOfUnix: live.timestamp,
    servedFrom: "upstream",
    fetchedAtUnix,
    ttlSeconds: MEMORY_TTL_SECONDS
  };
}

function getUsableCache(nowUnix: number): CachedRates | null {
  if (cached == null) {
    return null;
  }

  if (nowUnix >= cached.expiresAtUnix) {
    return null;
  }

  return cached;
}

async function fetchLiveRates(accessKey: string): Promise<LiveRates> {
  const url = new URL(UPSTREAM_URL);
  url.searchParams.set("access_key", accessKey);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    const text = await safeReadText(res);
    throw new Error(`Upstream error ${res.status}: ${text}`);
  }

  const json = await res.json();

  /**
   * FREE PLAN RESPONSE SHAPE:
   * {
   *   timestamp: number,
   *   source: "USD",
   *   quotes: {
   *     USDBTC: number,
   *     USDGBP: number,
   *     USDJPY: number
   *   }
   * }
   */

  const timestamp = readNumber(json, "timestamp");

  const source =
    typeof json?.source === "string" && json.source.length > 0
      ? json.source
      : "USD";

  const quotes = json?.quotes;
  if (typeof quotes !== "object" || quotes == null) {
    throw new Error("Upstream response missing 'quotes' object.");
  }

  const btc = readNumber(quotes, "USDBTC");
  const gbp = readNumber(quotes, "USDGBP");
  const jpy = readNumber(quotes, "USDJPY");

  if (source !== "USD") {
    throw new Error(`Unexpected upstream source '${source}', expected 'USD'.`);
  }

  return {
    base: source,
    timestamp,
    rates: {
      BTC: btc,
      GBP: gbp,
      JPY: jpy
    }
  };
}

function deriveBtcPerUnit(
  currency: SupportedCurrency,
  live: LiveRates
): Decimal {
  const btcPerUsd = new Decimal(live.rates.BTC);

  if (currency === "USD") {
    return btcPerUsd;
  }

  if (currency === "GBP") {
    const usdToGbp = new Decimal(live.rates.GBP);
    return btcPerUsd.div(usdToGbp);
  }

  // currency === "JPY"
  const usdToJpy = new Decimal(live.rates.JPY);
  return btcPerUsd.div(usdToJpy);
}

function readNumber(obj: any, key: string): number {
  const value = obj?.[key];

  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  throw new Error(`Upstream response missing numeric field '${key}'.`);
}

async function safeReadText(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}
