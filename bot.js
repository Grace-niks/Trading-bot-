
import xrpl from "xrpl";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const config = {
  issuerAddress: process.env.ISSUER_ADDRESS,
  tokenCurrency: process.env.TOKEN_CURRENCY,
  tradeFrequency: parseInt(process.env.TRADE_FREQUENCY || "4000"),
  baseAmount: parseFloat(process.env.TRADE_AMOUNT || "25000"),
  buyRatio: 80,
  walletSeeds: [process.env.WALLET1_SEED, process.env.WALLET2_SEED],
  xrplEndpoint: "wss://s1.ripple.com"
};

const client = new xrpl.Client(config.xrplEndpoint);
let wallets = [], walletIndex = 0, paused = false;
const botState = { trades: [], errors: 0, swaps: 0 };

const app = express();
app.use(cors());
app.get("/status", (_, res) => res.json(botState));
app.listen(3000, () => console.log("Bot API running at http://localhost:3000/status"));

function getRandomizedAmount(base) {
  const variance = base * 0.05;
  return (base + (Math.random() * variance * 2 - variance)).toFixed(2);
}
async function loadWallets() {
  wallets = config.walletSeeds.map(seed => xrpl.Wallet.fromSeed(seed));
}
function getCurrentWallet() { return wallets[walletIndex % 2]; }
function getNextWallet() { walletIndex++; return wallets[walletIndex % 2]; }

async function cancelOffers(account) {
  try {
    const offers = await client.request({ command: "account_offers", account });
    for (const offer of offers.result.offers) {
      const cancelTx = {
        TransactionType: "OfferCancel",
        Account: account,
        OfferSequence: offer.seq
      };
      const prepared = await client.autofill(cancelTx);
      const signed = getCurrentWallet().sign(prepared);
      await client.submitAndWait(signed.tx_blob);
    }
  } catch (err) {
    console.error("Cancel failed:", err);
    botState.errors++;
  }
}

async function checkBalances(account) {
  const balances = { xrp: 0, token: 0 };
  try {
    const response = await client.request({ command: "account_lines", account });
    const tokenLine = response.result.lines.find(line => line.currency === config.tokenCurrency && line.account === config.issuerAddress);
    balances.token = tokenLine ? parseFloat(tokenLine.balance) : 0;
    const accInfo = await client.request({ command: "account_info", account });
    balances.xrp = parseFloat(xrpl.dropsToXrp(accInfo.result.account_data.Balance));
  } catch (err) {
    console.error("Balance check failed:", err);
    botState.errors++;
  }
  return balances;
}

async function swapIfNeeded(wallet, balances) {
  const amount = (config.baseAmount / 2).toFixed(2);
  const action = balances.xrp < config.baseAmount ? "sell" : balances.token < config.baseAmount ? "buy" : null;
  if (!action) return false;

  console.log("Rebalancing via swap...");
  const tx = {
    TransactionType: "OfferCreate",
    Account: wallet.classicAddress,
    TakerGets: action === "buy" ? xrpl.xrpToDrops(amount) : { currency: config.tokenCurrency, issuer: config.issuerAddress, value: amount },
    TakerPays: action === "buy" ? { currency: config.tokenCurrency, issuer: config.issuerAddress, value: amount } : xrpl.xrpToDrops(amount),
    Flags: xrpl.OfferCreateFlags.tfPassive
  };

  try {
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    if (result.result.meta.TransactionResult === "tesSUCCESS") {
      botState.swaps++;
      console.log("Swap complete. Pausing for 1 minute...");
      paused = true;
      setTimeout(() => paused = false, 60000);
      return true;
    }
  } catch (err) {
    console.error("Swap failed:", err);
    botState.errors++;
  }
  return false;
}

async function createTrade(wallet, type) {
  const amount = getRandomizedAmount(config.baseAmount);
  const tx = {
    TransactionType: "OfferCreate",
    Account: wallet.classicAddress,
    TakerGets: type === "buy" ? xrpl.xrpToDrops(amount) : { currency: config.tokenCurrency, issuer: config.issuerAddress, value: amount },
    TakerPays: type === "buy" ? { currency: config.tokenCurrency, issuer: config.issuerAddress, value: amount } : xrpl.xrpToDrops(amount),
    Flags: xrpl.OfferCreateFlags.tfPassive
  };

  try {
    const prepared = await client.autofill(tx);
    const signed = wallet.sign(prepared);
    const result = await client.submitAndWait(signed.tx_blob);
    if (result.result.meta.TransactionResult === "tesSUCCESS") {
      botState.trades.push({ wallet: wallet.classicAddress, type, amount, time: new Date().toISOString() });
      console.log(`${type.toUpperCase()} ${amount} SUCCESS`);
    } else {
      botState.errors++;
    }
  } catch (err) {
    console.error("Trade failed:", err);
    botState.errors++;
  }
}

async function runBot() {
  await client.connect();
  await loadWallets();
  console.log("Bot connected to XRP Ledger Mainnet.");

  setInterval(async () => {
    if (paused) return;
    const wallet = getCurrentWallet();
    const balances = await checkBalances(wallet.classicAddress);
    const swapped = await swapIfNeeded(wallet, balances);
    if (swapped) return;
    await cancelOffers(wallet.classicAddress);
    const tradeType = Math.random() * 100 < config.buyRatio ? "buy" : "sell";
    await createTrade(wallet, tradeType);
    getNextWallet();
  }, config.tradeFrequency);
}

runBot();
