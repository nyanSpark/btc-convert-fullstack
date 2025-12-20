import type { SupportedCurrency } from "./types";

const SUPPORTED: SupportedCurrency[] = ["USD", "GBP", "JPY"];

/**
 * Validate currency and amount from query params.
 * - currency must be USD, GBP, or JPY
 * - amount must be a positive numeric string
 */
export function validateInput(currencyRaw: unknown, amountRaw: unknown): {
  ok: true;
  currency: SupportedCurrency;
  amount: string;
} | {
  ok: false;
  message: string;
} {
  if (typeof currencyRaw !== "string") {
    return { ok: false, message: "Query param 'currency' is required." };
  }

  const currencyUpper = currencyRaw.toUpperCase();

  if (!isSupportedCurrency(currencyUpper)) {
    return { ok: false, message: "Query param 'currency' must be one of: USD, GBP, JPY." };
  }

  if (typeof amountRaw !== "string") {
    return { ok: false, message: "Query param 'amount' is required." };
  }

  const amount = amountRaw.trim();

  if (amount.length === 0) {
    return { ok: false, message: "Query param 'amount' must be a positive numeric string." };
  }

  // Allow digits with optional decimal part. Disallow signs and exponent.
  const numericPattern = /^[0-9]+(\.[0-9]+)?$/;

  if (!numericPattern.test(amount)) {
    return { ok: false, message: "Query param 'amount' must be a positive numeric string (e.g. 10 or 10.5)." };
  }

  // Disallow zero
  const asNumber = Number(amount);
  if (!Number.isFinite(asNumber)) {
    return { ok: false, message: "Query param 'amount' must be a valid number." };
  }

  if (asNumber <= 0) {
    return { ok: false, message: "Query param 'amount' must be greater than 0." };
  }

  return {
    ok: true,
    currency: currencyUpper,
    amount
  };
}

function isSupportedCurrency(value: string): value is SupportedCurrency {
  if (value === "USD") {
    return true;
  }
  if (value === "GBP") {
    return true;
  }
  if (value === "JPY") {
    return true;
  }
  return false;
}
