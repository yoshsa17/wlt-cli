import { createRequire } from "node:module";
import BIP32Factory from "bip32";
import { address as bitcoinAddress, payments, Psbt, type Network } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import type { BitcoinAddress } from "../domain/valueObject/bitcoinAddress.js";
import { toSats, type Sats } from "../domain/valueObject/sats.js";
import { BITCOIN_NETWORK_BY_NAME } from "../domain/wallet/network.js";
import type { NetworkName, ScriptType } from "../domain/wallet/Wallet.js";
import { getAccountPath } from "../domain/wallet/walletPaths.js";
import type { Result } from "../types/utils.js";
import { Err, Ok } from "../utils/result.js";
import { ElectrumClient } from "./ElectrumClient.js";

const require = createRequire(import.meta.url);
const coinSelect = require("coinselect");
const bip32 = BIP32Factory(ecc);
const MIN_FEE_RATE_SATS_PER_VBYTE = 12;

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

export type OnlineWalletData = {
  network: NetworkName;
  scriptType: ScriptType;
  xpub: string;
  fingerprint: string;
};

export type BuildSendPsbtParams = {
  wallet: OnlineWalletData;
  sourceBranch: 0 | 1;
  sourceIndex: number;
  destinationAddress: BitcoinAddress;
  amountSats: Sats;
};

export type BuiltSendPsbt = {
  psbt: Psbt;
  sourceAddress: string;
  destinationAddress: BitcoinAddress;
  amountSats: Sats;
  feeRateSatsPerVbyte: number;
  estimatedFeeSats: Sats;
  selectedAmountSats: Sats;
  changeAmountSats: Sats;
};

const satsToNumber = (sats: Sats): number => {
  const satsNumber = Number(sats);
  if (!Number.isSafeInteger(satsNumber)) {
    throw new Error("Value is too large to fit in a safe integer.");
  }

  return satsNumber;
};

const getAddressFromPubkey = (
  pubkey: Buffer,
  network: Network,
  scriptType: ScriptType,
): string => {
  if (scriptType === "p2wpkh") {
    const address = payments.p2wpkh({ pubkey, network }).address;
    if (!address) {
      throw new Error("Failed to derive source p2wpkh address.");
    }
    return address;
  }

  const address = payments.p2pkh({ pubkey, network }).address;
  if (!address) {
    throw new Error("Failed to derive source p2pkh address.");
  }
  return address;
};

const validateAddressForNetwork = (
  address: string,
  network: Network,
): Result<void, string> => {
  try {
    bitcoinAddress.toOutputScript(address, network);
    return Ok();
  } catch {
    return Err("Destination address is invalid for this wallet network.");
  }
};

export const buildSendPsbt = async (
  params: BuildSendPsbtParams,
): Promise<Result<BuiltSendPsbt, string>> => {
  const btcNetwork = BITCOIN_NETWORK_BY_NAME[params.wallet.network];
  const destinationAddressResult = validateAddressForNetwork(params.destinationAddress, btcNetwork);
  if (!destinationAddressResult.isOk) {
    return destinationAddressResult;
  }

  if (params.amountSats <= 0n) {
    return Err("Amount must be greater than zero.");
  }

  const connectionConfig = ElectrumClient.getConnectionConfig(params.wallet.network);
  const client = new ElectrumClient(connectionConfig.host, connectionConfig.port);

  try {
    const accountNode = bip32.fromBase58(params.wallet.xpub, btcNetwork);
    const derivedNode = accountNode.derive(params.sourceBranch).derive(params.sourceIndex);
    const sourcePubkey = Buffer.from(derivedNode.publicKey);
    const sourceAddress = getAddressFromPubkey(sourcePubkey, btcNetwork, params.wallet.scriptType);
    const derivationPath =
      `${getAccountPath(params.wallet.network, params.wallet.scriptType)}/` +
      `${params.sourceBranch}/${params.sourceIndex}`;

    await client.connect();

    const feeRateSatsPerVbyte = Math.max(
      MIN_FEE_RATE_SATS_PER_VBYTE,
      satsToNumber(await client.estimateFee("HIGH")),
    );

    const utxos = await client.listUnspent(sourceAddress, btcNetwork);
    if (utxos.length === 0) {
      return Err("No spendable UTXOs were found for the selected source address.");
    }

    const coinSelectInputs: CoinSelectInput[] = utxos.map((utxo: { tx_hash: string; tx_pos: number; value: number }) => ({
      txId: utxo.tx_hash,
      vout: utxo.tx_pos,
      value: utxo.value,
    }));
    const coinSelectTargets: CoinSelectOutput[] = [
      {
        address: params.destinationAddress,
        value: satsToNumber(params.amountSats),
      },
    ];

    const { inputs, outputs, fee } = coinSelect(
      coinSelectInputs,
      coinSelectTargets,
      feeRateSatsPerVbyte,
    ) as CoinSelectResult;

    if (!inputs || !outputs) {
      return Err("coinselect could not find a valid input set.");
    }

    const psbt = new Psbt({ network: btcNetwork });
    for (const input of inputs) {
      const rawTransactionHex = await client.getTransaction(input.txId, false);
      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        nonWitnessUtxo: Buffer.from(rawTransactionHex, "hex"),
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(params.wallet.fingerprint, "hex"),
            path: derivationPath,
            pubkey: sourcePubkey,
          },
        ],
      });
    }

    for (const output of outputs) {
      psbt.addOutput({
        address: output.address ?? sourceAddress,
        value: output.value,
      });
    }

    const selectedAmountSats = toSats(
      inputs.reduce((sum, input) => sum + BigInt(input.value), 0n),
    );
    const changeAmountSats = toSats(
      BigInt(outputs.find((output) => output.address === undefined)?.value ?? 0),
    );

    return Ok({
      psbt,
      sourceAddress,
      destinationAddress: params.destinationAddress,
      amountSats: params.amountSats,
      feeRateSatsPerVbyte,
      estimatedFeeSats: toSats(BigInt(fee)),
      selectedAmountSats,
      changeAmountSats,
    });
  } catch (error) {
    if (error instanceof Error) {
      return Err(error.message);
    }

    throw error;
  } finally {
    client.close();
  }
};

export const broadcastSignedPsbt = async (
  psbt: Psbt,
  network: NetworkName,
): Promise<Result<string, string>> => {
  const connectionConfig = ElectrumClient.getConnectionConfig(network);
  const client = new ElectrumClient(connectionConfig.host, connectionConfig.port);

  try {
    await client.connect();
    psbt.finalizeAllInputs();
    const rawTransactionHex = psbt.extractTransaction().toHex();
    const txid = await client.broadcast(rawTransactionHex);
    return Ok(txid);
  } catch (error) {
    if (error instanceof Error) {
      return Err(error.message);
    }

    throw error;
  } finally {
    client.close();
  }
};
