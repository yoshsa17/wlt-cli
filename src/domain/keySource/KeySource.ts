import type { Psbt } from "bitcoinjs-lib";
import type { Result } from "../../types/utils.js";
import type { NetworkName, ScriptType } from "../wallet/Wallet.js";

export type WalletAccountData = {
  fingerprint: string;
  xpub: string;
};

export interface KeySource {
  getAccountData(scriptType: ScriptType, network: NetworkName): Promise<WalletAccountData>;
  signPsbt(psbt: Psbt, scriptType: ScriptType, network: NetworkName): Promise<Result<Psbt, string>>;
}
