import type { VercelRequest, VercelResponse } from "@vercel/node";
import Decimal from "decimal.js";
import { getBtcPerUnit } from "./_lib/exchangerate";
import { validateInput } from "./_lib/validate";
import type { ApiErrorResponse, BtcResponse } from "./_lib/types";

const CDN_S_MAXAGE_SECONDS = 30 * 60; // 30 minutes at Vercel edge
const CDN_STALE_WHILE_REVALIDATE_SECONDS = 24 * 60 * 60; // 24 hours

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  try {
    if (req.method !== "GET") {
      res.status(405).json({
        error: { message: "Method not allowed. Use GET." }
      } satisfies ApiErrorResponse);
      return;
    }

    const validation = validateInput(req.query.currency, req.query.amount);
    if (validation.ok === false) {
      res.status(400).json({
        error: { message: validation.message }
      } satisfies ApiErrorResponse);
      return;
    }

    const accessKey = process.env.EXCHANGERATE_HOST_ACCESS_KEY;
    if (typeof accessKey !== "string" || accessKey.length === 0) {
      res.status(500).json({
        error: {
          message: "Server is missing EXCHANGERATE_HOST_ACCESS_KEY environment variable."
        }
      } satisfies ApiErrorResponse);
      return;
    }

    // Fetch derived BTC-per-unit rate, with best-effort in-memory caching
    const rateResult = await getBtcPerUnit(validation.currency, accessKey);

    // BTC amount = input amount * btcPerUnit
    const amountDecimal = new Decimal(validation.amount);
    const btcAmount = amountDecimal.mul(rateResult.btcPerUnit);

    // Round to 8 decimal places and output as a string
    const btcRounded = btcAmount.toDecimalPlaces(8, Decimal.ROUND_DOWN);

    // CDN caching headers
    // s-maxage caches at the CDN edge; stale-while-revalidate allows serving stale while refreshing.
    res.setHeader(
      "Cache-Control",
      `public, s-maxage=${CDN_S_MAXAGE_SECONDS}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE_SECONDS}`
    );

    res.setHeader("Content-Type", "application/json; charset=utf-8");

    const body: BtcResponse = {
      input: {
        currency: validation.currency,
        amount: validation.amount
      },
      btc: {
        amount: btcRounded.toFixed(8)
      },
      rate: {
        btcPerUnit: rateResult.btcPerUnit.toSignificantDigits(12).toString(),
        asOfUnix: rateResult.asOfUnix,
        source: "exchangerate.host"
      },
      cache: {
        ttlSeconds: rateResult.ttlSeconds,
        servedFrom: rateResult.servedFrom,
        fetchedAtUnix: rateResult.fetchedAtUnix
      }
    };

    res.status(200).json(body);
  } catch (err) {
    const message = toErrorMessage(err);

    res.status(502).json({
      error: {
        message: "Failed to fetch or compute exchange rates.",
        details: message
      }
    } satisfies ApiErrorResponse);
  }
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (typeof err === "string") {
    return err;
  }
  return "Unknown error";
}
