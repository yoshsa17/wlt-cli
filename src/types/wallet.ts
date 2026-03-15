import type { ValueOf } from "./utils.js";

export type NetworkName = "mainnet" | "regtest" | "testnet";

export const ScriptType = {
  P2pkh: "p2pkh",
  P2wpkh: "p2wpkh",
} as const;
export type ScriptType = ValueOf<typeof ScriptType>;

export type WalletKeySourceFile =
  | {
      type: "software";
      mnemonic: string;
    }
  | {
      type: "watch_only";
    };

export type WalletFile = {
  version: 1;
  name: string;
  network: NetworkName;
  scriptType: ScriptType;
  fingerprint: string;
  xpub: string;
  createdAt: string;
  keySource?: WalletKeySourceFile;
};
