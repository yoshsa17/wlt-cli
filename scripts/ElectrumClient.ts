import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { address as bitcoinAddress, type Network } from "bitcoinjs-lib";

const require = createRequire(import.meta.url);
const ElectrumClient = require("@mempool/electrum-client");

export type ElectrumUtxo = {
  tx_hash: string;
  tx_pos: number;
  value: number;
};

export type ElectrumClient = {
  connect(): Promise<void>;
  blockchainEstimatefee(blockCount: number): Promise<number>;
  blockchainScripthash_listunspent(scripthash: string): Promise<ElectrumUtxo[]>;
  blockchainTransaction_get(txHash: string, verbose?: boolean): Promise<string>;
  blockchainTransaction_broadcast(rawTransactionHex: string): Promise<string>;
  close(): void;
};

export const createElectrumClient = (host: string, port: number): ElectrumClient => {
  return new ElectrumClient(port, host, "tls", undefined, {
    onLog: () => {},
  }) as ElectrumClient;
};

// ref: https://electrumx.readthedocs.io/en/latest/protocol-basics.html#script-hashes
export const toElectrumScriptHash = (address: string, network: Network): string => {
  const outputScript = bitcoinAddress.toOutputScript(address, network);
  const digest = createHash("sha256").update(outputScript).digest();
  return Buffer.from(digest).reverse().toString("hex");
};
