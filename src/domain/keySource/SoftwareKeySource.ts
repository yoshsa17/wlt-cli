import BIP32Factory from "bip32";
import type { HDSigner, Psbt } from "bitcoinjs-lib";
import * as bip39 from "bip39";
import * as ecc from "tiny-secp256k1";
import type { Mnemonic } from "../valueObject/mnemonic.js";
import type { Result } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";
import { BITCOIN_NETWORK_BY_NAME } from "../wallet/network.js";
import { getAccountPath } from "../wallet/walletPaths.js";
import type { KeySource, WalletAccountData } from "./KeySource.js";
import type { NetworkName, ScriptType } from "../wallet/Wallet.js";

const bip32 = BIP32Factory(ecc);

const createHdSigner = (node: ReturnType<typeof bip32.fromSeed>): HDSigner => {
  return {
    publicKey: Buffer.from(node.publicKey),
    fingerprint: Buffer.from(node.fingerprint),
    derivePath: (path: string): HDSigner => createHdSigner(node.derivePath(path)),
    sign: (hash: Buffer): Buffer => Buffer.from(node.sign(hash)),
  };
};

export class SoftwareKeySource implements KeySource {
  #mnemonic: Mnemonic;

  constructor(mnemonic: Mnemonic) {
    this.#mnemonic = mnemonic;
  }

  getAccountData = async (scriptType: ScriptType, network: NetworkName): Promise<WalletAccountData> => {
    const btcNetwork = BITCOIN_NETWORK_BY_NAME[network];

    const seed = await bip39.mnemonicToSeed(this.#mnemonic);
    const accountPath = getAccountPath(network, scriptType);

    const root = bip32.fromSeed(seed, btcNetwork);
    const accountData = {
      fingerprint: Buffer.from(root.fingerprint).toString("hex"),
      xpub: root.derivePath(accountPath).neutered().toBase58(),
    };

    return accountData;
  };
  signPsbt = async (
    psbt: Psbt,
    scriptType: ScriptType,
    network: NetworkName,
  ): Promise<Result<Psbt, string>> => {
    const seed = await bip39.mnemonicToSeed(this.#mnemonic);
    const btcNetwork = BITCOIN_NETWORK_BY_NAME[network];
    const root = createHdSigner(bip32.fromSeed(seed, btcNetwork));

    let signedInputCount = 0;
    for (let inputIndex = 0; inputIndex < psbt.inputCount; inputIndex++) {
      try {
        if (!psbt.inputHasHDKey(inputIndex, root)) {
          continue;
        }

        psbt.signInputHD(inputIndex, root);
        signedInputCount++;
      } catch {
        continue;
      }
    }

    if (signedInputCount === 0) {
      return Err("No PSBT inputs could be signed with this wallet.");
    }

    return Ok(psbt);
  };
}
