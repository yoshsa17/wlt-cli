import * as os from "node:os";
import * as path from "node:path";
import { constants as fsConstants, promises as fs } from "node:fs";
import BIP32Factory from "bip32";
import * as bip39 from "bip39";
import * as ecc from "tiny-secp256k1";
import { parseWalletName, type WalletName } from "../domain/valueObject/walletName.js";
import type { WalletPassword } from "../domain/valueObject/walletPassword.js";
import { Wallet, type KeySourceDataFile, type WalletFile } from "../domain/wallet/Wallet.js";
import type { Result } from "../types/utils.js";
import { BITCOIN_NETWORK_BY_NAME } from "../domain/wallet/network.js";
import { decryptPayload, encryptPayload } from "../utils/crypto.js";
import { Err, Ok } from "../utils/result.js";
import type { EncryptedPayload, EncryptedWalletFile } from "../types/crypto.js";

const bip32 = BIP32Factory(ecc);
const APP_DIRECTORY_NAME = ".wltcli";
const WALLET_DIRECTORY_NAME = "wallets";
const WALLET_FILE_EXTENSION = ".wlt";
const APP_DIRECTORY_MODE = 0o700; // rwx------
const WALLET_FILE_MODE = 0o600; // rw-------
const APP_DIR = path.join(os.homedir(), "", APP_DIRECTORY_NAME);
const WALLET_FILE_DIR = path.join(APP_DIR, WALLET_DIRECTORY_NAME);
const MAX_WALLET_FILE_SIZE_BYTES = 1024 * 1024; // 1 Mib

export class WalletStorageService {
  /**
   * Checks whether a wallet file already exists in local storage.
   */
  checkWalletFileExists = async (walletName: WalletName): Promise<boolean> => {
    const walletFilePath = this.getWalletFilePathByName(walletName);
    const readableWalletFileResult = await this.checkWalletFileReadable(walletFilePath);
    return readableWalletFileResult.isOk;
  };

  /**
   * Returns the local file path for a wallet name.
   */
  getWalletPath = (walletName: WalletName): string => this.getWalletFilePathByName(walletName);

  /**
   * Returns the local wallet file path for a wallet name.
   */
  getWalletFilePathByName = (walletName: WalletName): string =>
    path.join(WALLET_FILE_DIR, `${walletName}${WALLET_FILE_EXTENSION}`);

  /**
   * Encrypts and stores a wallet file on local disk.
   */
  saveToLocal = async (wallet: WalletFile, password: WalletPassword): Promise<Result<void, string>> => {
    try {
      const validatedWalletName = this.validateWalletName(wallet.name);
      const walletFilePath = this.getWalletFilePathByName(validatedWalletName);
      const readableWalletFileResult = await this.checkWalletFileReadable(walletFilePath);
      if (readableWalletFileResult.isOk) {
        return Err(`Wallet already exists at ${walletFilePath}.`);
      }

      const encrypted = await this.encryptWalletData(wallet, password);
      await this.makeWalletDirIfNotExists();

      await fs.writeFile(walletFilePath, `${JSON.stringify(encrypted, null, 2)}\n`, {
        mode: WALLET_FILE_MODE,
        flag: "wx", // create file exclusively, failing if the file already exists
      });

      return Ok();
    } catch (error) {
      if (this.isAlreadyExistsError(error)) {
        const validatedWalletName = this.validateWalletName(wallet.name);
        return Err(`Wallet already exists at ${this.getWalletFilePathByName(validatedWalletName)}.`);
      }
      if (error instanceof Error) {
        return Err(error.message);
      }

      throw error;
    }
  };

  /**
   * Get wallet names from readable wallet files in local storage.
   */
  getWalletNames = async (): Promise<WalletName[]> => {
    try {
      const dirEntries = await fs.readdir(WALLET_FILE_DIR, { withFileTypes: true });
      const walletNameStrings = dirEntries
        .filter((entry) => entry.isFile() && entry.name.endsWith(WALLET_FILE_EXTENSION))
        .map((entry) => entry.name.slice(0, -WALLET_FILE_EXTENSION.length));

      const walletNames: WalletName[] = [];
      for (const walletName of walletNameStrings) {
        const walletNameResult = parseWalletName(walletName);
        if (walletNameResult.isOk) {
          walletNames.push(walletNameResult.value);
        }

        // skip invalid file name
      }

      return walletNames.sort((left, right) => left.localeCompare(right));
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return [];
      }

      throw error;
    }
  };

  /**
   * Loads and decrypts a wallet file from local disk.
   */
  loadWallet = async (walletName: WalletName, password: WalletPassword): Promise<Result<Wallet, string>> => {
    try {
      const walletFilePath = this.getWalletFilePathByName(walletName);
      const checkResult = await this.checkWalletFileReadable(walletFilePath);
      if (!checkResult.isOk) {
        return checkResult;
      }

      const encrypted = await this.readEncryptedWalletFile(walletFilePath);
      const wallet = await this.decryptWalletData(encrypted, password);
      if (wallet.name !== encrypted.name) {
        return Err("Wallet file metadata mismatch.");
      }

      return Ok(Wallet.fromFile(wallet));
    } catch (error) {
      if (error instanceof Error) {
        return Err(error.message);
      }

      throw error;
    }
  };

  ///////////////////////////////////////////////
  // PRIVATE
  ///////////////////////////////////////////////

  private checkWalletFileReadable = async (walletFilePath: string): Promise<Result<string, string>> => {
    try {
      await fs.access(walletFilePath, fsConstants.R_OK);
      return Ok(walletFilePath);
    } catch (error) {
      if (this.isNotFoundError(error)) {
        return Err("Wallet file not found.");
      }
      throw error;
    }
  };

  private makeWalletDirIfNotExists = async (): Promise<void> => {
    await fs.mkdir(WALLET_FILE_DIR, { recursive: true, mode: APP_DIRECTORY_MODE });
  };

  private encryptWalletData = async (wallet: WalletFile, password: string): Promise<EncryptedWalletFile> => {
    const validatedWalletFile = this.validateWalletFile(wallet);
    const stringifiedWalletFile = JSON.stringify(validatedWalletFile);
    const encryptedWalletFile = await encryptPayload(stringifiedWalletFile, password);

    return {
      version: 1,
      name: wallet.name,
      wallet: encryptedWalletFile,
    };
  };

  private isNotFoundError = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && error.code === "ENOENT";

  private isAlreadyExistsError = (error: unknown): error is NodeJS.ErrnoException =>
    error instanceof Error && "code" in error && error.code === "EEXIST";

  private decryptWalletData = async (file: EncryptedWalletFile, password: string): Promise<WalletFile> => {
    try {
      return this.validateWalletFile(JSON.parse(await decryptPayload(file.wallet, password)));
    } catch {
      throw new Error("Invalid password or corrupted wallet file.");
    }
  };

  private readEncryptedWalletFile = async (walletFilePath: string): Promise<EncryptedWalletFile> => {
    const walletFileStats = await fs.stat(walletFilePath);
    if (walletFileStats.size > MAX_WALLET_FILE_SIZE_BYTES) {
      throw new Error("Wallet file is too large.");
    }

    const raw = await fs.readFile(walletFilePath, "utf8");
    return this.validateEncryptedWalletFile(JSON.parse(raw));
  };

  private validateWalletFile = (value: unknown): WalletFile => {
    if (typeof value !== "object" || value === null) {
      throw new Error("Wallet file is not a valid object.");
    }

    const v = value as Partial<WalletFile>;
    if (v.version !== 1) {
      throw new Error("Unsupported wallet version.");
    }
    if (v.network !== "mainnet" && v.network !== "testnet" && v.network !== "regtest") {
      throw new Error("Wallet network is invalid.");
    }
    if (v.scriptType !== "p2pkh" && v.scriptType !== "p2wpkh") {
      throw new Error("Wallet scriptType is invalid.");
    }
    try {
      bip32.fromBase58(this.validateXpub(v.xpub), BITCOIN_NETWORK_BY_NAME[v.network]);
    } catch {
      throw new Error("Wallet xpub is invalid.");
    }
    if (typeof v.createdAt !== "string") {
      throw new Error("Wallet createdAt is invalid.");
    }
    if (typeof v.fingerprint !== "string" || !/^[0-9a-fA-F]{8}$/.test(v.fingerprint.trim())) {
      throw new Error("Wallet fingerprint is invalid.");
    }

    return {
      version: 1,
      name: this.validateWalletName(v.name),
      network: v.network,
      scriptType: v.scriptType,
      fingerprint: v.fingerprint.trim().toLowerCase(),
      xpub: this.validateXpub(v.xpub),
      createdAt: v.createdAt,
      keySource: this.validateKeySourceDataFile(v.keySource),
    };
  };

  private validateKeySourceDataFile = (value: unknown): KeySourceDataFile | undefined => {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== "object" || value === null) {
      throw new Error("Wallet key source is not a valid object.");
    }

    const keySource = value as Partial<KeySourceDataFile>;
    if (keySource.type === "watch_only") {
      return { type: "watch_only" };
    }

    if (keySource.type === "software" && typeof keySource.mnemonic === "string") {
      return {
        type: "software",
        mnemonic: this.validateMnemonic(keySource.mnemonic),
      };
    }

    throw new Error("Wallet key source is not valid.");
  };

  private validateEncryptedPayload = (value: unknown): EncryptedPayload => {
    if (typeof value !== "object" || value === null) {
      throw new Error("Encrypted payload is not a valid object.");
    }

    const v = value as Partial<EncryptedPayload>;
    if (typeof v.salt !== "string" || v.salt.length === 0) {
      throw new Error("Wallet salt is invalid.");
    }
    if (typeof v.iv !== "string" || v.iv.length === 0) {
      throw new Error("Wallet iv is invalid.");
    }
    if (typeof v.tag !== "string" || v.tag.length === 0) {
      throw new Error("Wallet tag is invalid.");
    }
    if (typeof v.ciphertext !== "string" || v.ciphertext.length === 0) {
      throw new Error("Wallet ciphertext is invalid.");
    }

    return {
      salt: v.salt,
      iv: v.iv,
      tag: v.tag,
      ciphertext: v.ciphertext,
    };
  };

  private validateEncryptedWalletFile = (value: unknown): EncryptedWalletFile => {
    if (typeof value !== "object" || value === null) {
      throw new Error("Wallet file is not a valid object.");
    }

    const v = value as Partial<EncryptedWalletFile>;
    if (v.version !== 1) {
      throw new Error("Unsupported wallet version.");
    }

    return {
      version: 1,
      name: this.validateWalletName(v.name),
      wallet: this.validateEncryptedPayload(v.wallet),
      secret: v.secret === undefined ? undefined : this.validateEncryptedPayload(v.secret),
    };
  };

  private validateWalletName = (value: unknown): WalletName => {
    if (typeof value !== "string") {
      throw new Error("Wallet name is missing.");
    }

    const normalizedValue = value.trim();
    if (normalizedValue.length === 0) {
      throw new Error("Wallet name is missing.");
    }
    if (!/^(?!-)(?!.*--)(?!.*-$)[a-z0-9-]+$/.test(normalizedValue)) {
      throw new Error("Wallet name must use lowercase letters, numbers, and hyphen (-) only.");
    }

    return normalizedValue as WalletName;
  };

  private validateMnemonic = (value: unknown): string => {
    if (typeof value !== "string" || !bip39.validateMnemonic(value.trim())) {
      throw new Error("Wallet mnemonic is invalid.");
    }

    return value.trim();
  };

  private validateXpub = (value: unknown): string => {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("Wallet xpub is invalid.");
    }

    return value.trim();
  };
}

export const walletStorageService = new WalletStorageService();
