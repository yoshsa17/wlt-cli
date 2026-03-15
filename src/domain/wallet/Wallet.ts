import BIP32Factory from "bip32";
import { payments } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { parseMnemonic, type Mnemonic } from "../valueObject/mnemonic.js";
import { SoftwareKeySource } from "../keySource/SoftwareKeySource.js";
import { parseWalletName, type WalletName } from "../valueObject/walletName.js";
import { BITCOIN_NETWORK_BY_NAME } from "./network.js";
import { ValueOf } from "../../types/utils.js";

type KeySourceData =
  | {
      type: "software";
      mnemonic: Mnemonic;
    }
  | {
      type: "watch_only";
    };

export type KeySourceDataFile =
  | {
      type: "software";
      mnemonic: string;
    }
  | {
      type: "watch_only";
    };

export type NetworkName = "mainnet" | "regtest" | "testnet";

export const ScriptType = {
  P2pkh: "p2pkh",
  P2wpkh: "p2wpkh",
} as const;
export type ScriptType = ValueOf<typeof ScriptType>;

export type WalletFile = {
  version: 1;
  name: string;
  network: NetworkName;
  scriptType: ScriptType;
  fingerprint: string;
  xpub: string;
  createdAt: string;
  keySource?: KeySourceDataFile;
};

const bip32 = BIP32Factory(ecc);

/**
 * Domain model for a wallet with public account data and key source data.
 */
export class Wallet {
  readonly name: WalletName;
  readonly network: NetworkName;
  readonly scriptType: ScriptType;
  readonly fingerprint: string;
  readonly xpub: string;
  readonly createdAt: string;
  readonly keySourceData: KeySourceData;

  private constructor(params: {
    name: WalletName;
    network: NetworkName;
    scriptType: ScriptType;
    fingerprint: string;
    xpub: string;
    createdAt: string;
    keySourceData: KeySourceData;
  }) {
    this.name = params.name;
    this.network = params.network;
    this.scriptType = params.scriptType;
    this.fingerprint = params.fingerprint;
    this.xpub = params.xpub;
    this.createdAt = params.createdAt;
    this.keySourceData = params.keySourceData;
  }

  /**
   * Build a software wallet from mnemonic-based account data.
   */
  static async create(params: {
    name: WalletName;
    network: NetworkName;
    scriptType: ScriptType;
    mnemonic: Mnemonic;
  }): Promise<Wallet> {
    const keySource = new SoftwareKeySource(params.mnemonic);
    const accountData = await keySource.getAccountData(params.scriptType, params.network);

    return new Wallet({
      name: params.name,
      network: params.network,
      scriptType: params.scriptType,
      fingerprint: accountData.fingerprint,
      xpub: accountData.xpub,
      createdAt: new Date().toISOString(),
      keySourceData: {
        type: "software",
        mnemonic: params.mnemonic,
      },
    });
  }

  /**
   * Rehydrate a domain wallet from the persisted wallet file shape.
   */
  static fromFile(file: WalletFile): Wallet {
    return new Wallet({
      name: Wallet.parseWalletName(file.name),
      network: file.network,
      scriptType: file.scriptType,
      fingerprint: file.fingerprint,
      xpub: file.xpub,
      createdAt: file.createdAt,
      keySourceData: Wallet.getKeySourceDataFromFile(file),
    });
  }

  /**
   * Derive a receive or change address from the account xpub.
   */
  deriveAddress = (index = 0, change: 0 | 1 = 0): string => {
    const btcNetwork = BITCOIN_NETWORK_BY_NAME[this.network];
    const accountNode = bip32.fromBase58(this.xpub, btcNetwork);
    const childNode = accountNode.derive(change).derive(index);
    const pubkey = Buffer.from(childNode.publicKey);

    if (this.scriptType === "p2wpkh") {
      const address = payments.p2wpkh({ pubkey, network: btcNetwork }).address;
      if (!address) {
        throw new Error("Failed to derive p2wpkh address.");
      }
      return address;
    }

    const address = payments.p2pkh({ pubkey, network: btcNetwork }).address;
    if (!address) {
      throw new Error("Failed to derive p2pkh address.");
    }
    return address;
  };

  /**
   * Convert the domain wallet into the persisted wallet file shape.
   */
  toFile = (): WalletFile => {
    return {
      version: 1,
      name: this.name,
      network: this.network,
      scriptType: this.scriptType,
      fingerprint: this.fingerprint,
      xpub: this.xpub,
      createdAt: this.createdAt,
      keySource: this.keySourceData,
    };
  };

  private static parseWalletName = (value: string): WalletName => {
    const walletNameResult = parseWalletName(value);
    if (!walletNameResult.isOk) {
      throw new Error(walletNameResult.error);
    }

    return walletNameResult.value;
  };

  private static getKeySourceDataFromFile = (file: WalletFile): KeySourceData => {
    if (file.keySource?.type === "software") {
      const mnemonicResult = parseMnemonic(file.keySource.mnemonic);
      if (!mnemonicResult.isOk) {
        throw new Error(mnemonicResult.error);
      }

      return {
        type: "software",
        mnemonic: mnemonicResult.value,
      };
    }

    return { type: "watch_only" };
  };
}
