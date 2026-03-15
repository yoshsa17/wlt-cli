import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { address as bitcoinAddress, type Network } from "bitcoinjs-lib";
import { parseSatsFromBtc } from "../domain/valueObject/btc.js";
import { toSats, type Sats } from "../domain/valueObject/sats.js";
import type { NetworkName } from "../domain/wallet/Wallet.js";

const require = createRequire(import.meta.url);
const ElectrumClientConstructor = require("@mempool/electrum-client");

export type ElectrumConnectionConfig = {
  host: string;
  port: number;
};

type FeeLevel = "LOW" | "MEDIUM" | "HIGH";

export type ElectrumUtxo = {
  tx_hash: string;
  tx_pos: number;
  value: number;
};

type ElectrumClientInstance = {
  connect(): Promise<void>;
  blockchainEstimatefee(blockCount: number): Promise<number>;
  blockchainScripthash_listunspent(scripthash: string): Promise<ElectrumUtxo[]>;
  blockchainTransaction_get(txHash: string, verbose?: boolean): Promise<string>;
  blockchainTransaction_broadcast(rawTransactionHex: string): Promise<string>;
  close(): void;
};

/**
 * Thin wrapper around an Electrum RPC client.
 */
export class ElectrumClient {
  #client: ElectrumClientInstance;

  constructor(host: string, port: number) {
    this.#client = new ElectrumClientConstructor(port, host, "tls", undefined, {
      onLog: () => {},
    }) as ElectrumClientInstance;
  }

  /**
   * Return the default Electrum connection settings for a supported network.
   */
  // TODO: make it customizable
  // see: https://blog.blockstream.com/real-time-bitcoin-data-at-scale-blockstream-explorer-api-launches-electrum-rpc/?utm_source=chatgpt.com
  static getConnectionConfig = (network: NetworkName): ElectrumConnectionConfig => {
    switch (network) {
      case "mainnet":
        return { host: "blockstream.info", port: 700 };
      case "testnet":
        return { host: "blockstream.info", port: 993 };
      case "regtest":
        throw new Error("Online send mode does not support regtest yet.");
      default:
        throw new Error("Unsupported network.");
    }
  };

  /**
   * Convert an address into the Electrum scripthash format.
   */
  static toScriptHash = (address: string, network: Network): string => {
    const outputScript = bitcoinAddress.toOutputScript(address, network);
    const digest = createHash("sha256").update(outputScript).digest();
    return Buffer.from(digest).reverse().toString("hex");
  };

  /**
   * Map a fee level to the target confirmation block count used for estimation.
   */
  static getFeeTargetBlockCount = (feeLevel: FeeLevel): number => {
    switch (feeLevel) {
      case "HIGH":
        return 1;
      case "MEDIUM":
        return 3;
      case "LOW":
      default:
        return 6;
    }
  };

  /**
   * Open the underlying Electrum connection.
   */
  connect = (): Promise<void> => this.#client.connect();

  /**
   * Estimate a fee rate for the requested fee level and return it as sats/vbyte.
   */
  estimateFee = async (feeLevel: FeeLevel): Promise<Sats> => {
    const blockCount = ElectrumClient.getFeeTargetBlockCount(feeLevel);
    const feeRateBtcPerKilobyte = await this.#client.blockchainEstimatefee(blockCount);
    if (!Number.isFinite(feeRateBtcPerKilobyte) || feeRateBtcPerKilobyte <= 0) {
      throw new Error("Value must be a positive number.");
    }

    const feeRateSatsPerKilobyteResult = parseSatsFromBtc(feeRateBtcPerKilobyte.toFixed(8));
    if (!feeRateSatsPerKilobyteResult.isOk) {
      throw new Error(feeRateSatsPerKilobyteResult.error);
    }

    const feeRateSatsPerVbyte = Number(feeRateSatsPerKilobyteResult.value / 1000n);
    if (!Number.isSafeInteger(feeRateSatsPerVbyte) || feeRateSatsPerVbyte <= 0) {
      throw new Error("Fee rate is invalid.");
    }

    return toSats(BigInt(feeRateSatsPerVbyte));
  };

  /**
   * Fetch all unspent outputs for an address.
   */
  listUnspent = (address: string, network: Network): Promise<ElectrumUtxo[]> => {
    const scriptHash = ElectrumClient.toScriptHash(address, network);
    return this.#client.blockchainScripthash_listunspent(scriptHash);
  };

  /**
   * Fetch a transaction by txid.
   */
  getTransaction = (txHash: string, verbose?: boolean): Promise<string> =>
    this.#client.blockchainTransaction_get(txHash, verbose);

  /**
   * Broadcast a raw transaction hex string.
   */
  broadcast = (rawTransactionHex: string): Promise<string> =>
    this.#client.blockchainTransaction_broadcast(rawTransactionHex);

  /**
   * Close the underlying Electrum connection.
   */
  close = (): void => {
    this.#client.close();
  };
}
