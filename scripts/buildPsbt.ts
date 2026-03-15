import { createRequire } from "node:module";
import BIP32Factory from "bip32";
import { networks, payments, Psbt } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { createElectrumClient, toElectrumScriptHash } from "./ElectrumClient.js";

const require = createRequire(import.meta.url);
const coinSelect = require("coinselect");
const bip32 = BIP32Factory(ecc);
const MIN_FEE_RATE_SATS_PER_VBYTE = 12;
const SATOSHIS_PER_BTC = 100_000_000n;
const SOURCE_WALLET = {
  masterFingerprint: "a684dbf3",
  derivation: "m/44'/1'/0'",
  xpub: "tpubDDVQS5fQvGUZEuDHnHFZhMfJy4yHi685kfrZRCTc5cyNDbwMmUoySczs8E9WqBGk7doJ8X8HYAJntCJ53rRuyfLDm4JkhZFAQQCiypcQRft",
} as const;
const SOURCE_BRANCH = 0;
const SOURCE_INDEX = 0;
const SOURCE_DERIVATION_PATH = `${SOURCE_WALLET.derivation}/${SOURCE_BRANCH}/${SOURCE_INDEX}`;

type CoinSelectInput = {
  txId: string;
  vout: number;
  value: number;
};

type CoinSelectOutput = {
  address?: string;
  value: number;
};

type CoinSelectResult = {
  inputs?: CoinSelectInput[];
  outputs?: CoinSelectOutput[];
  fee: number;
};

const assertPositiveFiniteNumber = (value: number): void => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Value must be a positive number.");
  }
};

const btcToSats = (btc: string): bigint => {
  const normalizedBtc = btc.trim();
  if (!/^\d+(\.\d{1,8})?$/.test(normalizedBtc)) {
    throw new Error("BTC amount must be a decimal string with up to 8 fractional digits.");
  }

  const [wholePart, fractionalPart = ""] = normalizedBtc.split(".");
  const wholeSats = BigInt(wholePart) * SATOSHIS_PER_BTC;
  const fractionalSats = BigInt(fractionalPart.padEnd(8, "0"));
  return wholeSats + fractionalSats;
};

const satsToNumber = (sats: bigint): number => {
  const satsNumber = Number(sats);
  if (!Number.isSafeInteger(satsNumber)) {
    throw new Error("Value is too large to fit in a safe integer.");
  }

  return satsNumber;
};

const main = async (): Promise<void> => {
  // ref: https://blog.blockstream.com/en-esplora-and-other-alternatives-to-electrumx/
  const host = "blockstream.info";
  const port = 993;
  const network = networks.testnet;
  const destinationAddress = "mvrqprjAtfqYsLCGgPb47qBV9GQZjTQrR1";
  const amountSats = btcToSats("0.0001");

  const client = createElectrumClient(host, port);

  try {
    const accountNode = bip32.fromBase58(SOURCE_WALLET.xpub, network);
    const derivedNode = accountNode.derive(SOURCE_BRANCH).derive(SOURCE_INDEX);
    const sourceAddress = payments.p2pkh({
      pubkey: Buffer.from(derivedNode.publicKey),
      network,
    }).address;
    if (!sourceAddress) {
      throw new Error("Failed to derive source address from the configured wallet data.");
    }
    const changeAddress = sourceAddress;

    await client.connect();

    // get estimated fee rate
    const feeRateBtcPerKilobyte = await client.blockchainEstimatefee(1);
    console.log(`feeBtcPerKilobyte: ${feeRateBtcPerKilobyte}`);
    assertPositiveFiniteNumber(feeRateBtcPerKilobyte);
    const feeRateSatsPerKilobyte = btcToSats(feeRateBtcPerKilobyte.toFixed(8));
    console.log(`feeRateSatsPerKilobyte: ${feeRateSatsPerKilobyte}`);
    const feeRateSatsPerVbyte = satsToNumber(feeRateSatsPerKilobyte / 1000n);
    console.log(`feeRateSatsPerVbyte: ${feeRateSatsPerVbyte}`);
    const feeRate = Math.max(MIN_FEE_RATE_SATS_PER_VBYTE, feeRateSatsPerVbyte);

    // select utxo
    const scriptHash = toElectrumScriptHash(sourceAddress, network);
    const utxos = await client.blockchainScripthash_listunspent(scriptHash);
    console.log(JSON.stringify(utxos, null, 2));
    const coinSelectInputs: CoinSelectInput[] = utxos.map((utxo) => ({
      txId: utxo.tx_hash,
      vout: utxo.tx_pos,
      value: utxo.value,
    }));
    const coinSelectTargets: CoinSelectOutput[] = [
      {
        address: destinationAddress,
        value: satsToNumber(amountSats),
      },
    ];
    const { inputs, outputs, fee } = coinSelect(
      coinSelectInputs,
      coinSelectTargets,
      feeRate,
    ) as CoinSelectResult;
    if (!inputs || !outputs) {
      throw new Error("coinselect could not find a valid input set.");
    }

    const selectedAmount = inputs.reduce((sum, input) => sum + input.value, 0);

    // Build PSBT
    const psbt = new Psbt({ network });
    for (const input of inputs) {
      const rawTransactionHex = await client.blockchainTransaction_get(input.txId, false);
      console.log(rawTransactionHex);

      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        nonWitnessUtxo: Buffer.from(rawTransactionHex, "hex"),
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(SOURCE_WALLET.masterFingerprint, "hex"),
            path: SOURCE_DERIVATION_PATH,
            pubkey: Buffer.from(derivedNode.publicKey),
          },
        ],
      });
    }

    for (const output of outputs) {
      if (output.value === undefined) {
        continue;
      }

      psbt.addOutput({
        address: output.address ?? changeAddress,
        value: output.value,
      });
    }

    console.log("");
    console.log("----------------");
    console.log("PSBT summary");
    console.log(`Source: ${sourceAddress}`);
    console.log(`Destination: ${destinationAddress}`);
    console.log(`Amount: ${amountSats.toString()} sats`);
    console.log(`Fee rate: ${feeRateSatsPerVbyte}`);
    console.log(`Estimated fee: ${fee}`);
    console.log(`Selected inputs: ${inputs.length}`);
    console.log(`Selected amount: ${selectedAmount}`);
    console.log(`Change: ${outputs.find((output) => output.address === undefined)?.value ?? 0}`);
    console.log("");
    console.log("PSBT (base64)");
    console.log(psbt.toBase64());
  } finally {
    client.close();
  }
};

await main();
