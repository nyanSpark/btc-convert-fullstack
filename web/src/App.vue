<script lang="ts">
import { defineComponent } from "vue";
import { fetchBtcConversion, type BtcApiResponse, type SupportedCurrency } from "./api";

type UiState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: BtcApiResponse }
  | { kind: "error"; message: string };

export default defineComponent({
  name: "App",
  data() {
    return {
      currency: "USD" as SupportedCurrency,
      amount: "1000",
      state: { kind: "idle" } as UiState
    };
  },
  methods: {
    async onConvert() {
      const amountTrimmed = this.amount.trim();

      if (amountTrimmed.length === 0) {
        this.state = { kind: "error", message: "Please enter an amount." };
        return;
      }

      this.state = { kind: "loading" };

      try {
        const data = await fetchBtcConversion(this.currency, amountTrimmed);
        this.state = { kind: "success", data };
      } catch (err) {
        const message = this.toErrorMessage(err);
        this.state = { kind: "error", message };
      }
    },
    toErrorMessage(err: unknown) {
      if (err instanceof Error) {
        return err.message;
      }
      if (typeof err === "string") {
        return err;
      }
      return "Unknown error";
    },
    formatUnix(unix: number) {
      if (!Number.isFinite(unix)) {
        return "N/A";
      }
      const d = new Date(unix * 1000);
      return d.toLocaleString();
    }
  }
});
</script>

<template>
  <div class="container">
    <div class="card">
      <h1>Bitcoin Conversion Tool</h1>
      <p>
        Convert a fiat amount (USD, GBP, JPY) into BTC using cached live exchange rates.
      </p>

      <div class="row">
        <div class="field">
          <label for="currency">Currency</label>
          <select id="currency" v-model="currency">
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <div class="field">
          <label for="amount">Amount</label>
          <input
            id="amount"
            v-model="amount"
            inputmode="decimal"
            placeholder="e.g. 1000"
          />
        </div>
      </div>

      <button :disabled="state.kind === 'loading'" @click="onConvert">
        <span v-if="state.kind !== 'loading'">Convert</span>
        <span v-else>Converting...</span>
      </button>

      <div class="result" v-if="state.kind === 'success'">
        <div class="kv">
          <div class="k">BTC Amount</div>
          <div class="v badge-ok">{{ state.data.btc.amount }}</div>
        </div>

        <div class="kv">
          <div class="k">Input</div>
          <div class="v">{{ state.data.input.amount }} {{ state.data.input.currency }}</div>
        </div>

        <div class="kv">
          <div class="k">BTC per 1 {{ state.data.input.currency }}</div>
          <div class="v">{{ state.data.rate.btcPerUnit }}</div>
        </div>

        <div class="kv">
          <div class="k">Rate timestamp</div>
          <div class="v">{{ formatUnix(state.data.rate.asOfUnix) }}</div>
        </div>

        <div class="kv">
          <div class="k">Cache served from</div>
          <div class="v">{{ state.data.cache.servedFrom }}</div>
        </div>

        <div class="kv">
          <div class="k">Memory TTL remaining</div>
          <div class="v">{{ state.data.cache.ttlSeconds }}s</div>
        </div>

        <div class="small">
          Source: {{ state.data.rate.source }}
        </div>
      </div>

      <div class="result" v-if="state.kind === 'error'">
        <div class="kv">
          <div class="k">Status</div>
          <div class="v badge-err">Error</div>
        </div>
        <div class="small">{{ state.message }}</div>
      </div>

      <div class="result" v-if="state.kind === 'idle'">
        <div class="small">
          Tip: Try <code>?currency=USD&amount=1000</code> directly in your browser at <code>/api/btc</code>.
        </div>
      </div>
    </div>
  </div>
</template>
