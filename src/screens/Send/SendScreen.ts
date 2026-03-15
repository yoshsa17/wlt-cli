import { createRequire } from "node:module";
import BIP32Factory from "bip32";
import { payments, Psbt, type Network } from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import type { BitcoinAddress } from "../../domain/valueObject/bitcoinAddress.js";
import { satsToBtc, toSats, type Sats } from "../../domain/valueObject/sats.js";
import { BITCOIN_NETWORK_BY_NAME } from "../../domain/wallet/network.js";
import type { ScriptType, Wallet } from "../../domain/wallet/Wallet.js";
import { getAccountPath } from "../../domain/wallet/walletPaths.js";
import { AppScreen, hasWallet, type AppState } from "../../state.js";
import type { Result } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";
import { ElectrumClient } from "../../services/ElectrumClient.js";
import { askConfirmation } from "../common/askConfirmation.js";
import { askErrorConfirmation } from "../common/askErrorConfirmation.js";
import { askPaymentParams, type FeeLevel as FeeLevelType } from "./askPaymentParams.js";

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

type SpendableUtxo = CoinSelectInput & {
  address: string;
  pubkey: Buffer;
  derivationPath: string;
};

type BuiltSendPsbt = {
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

const getAddressFromPubkey = (pubkey: Buffer, network: Network, scriptType: ScriptType): string => {
  if (scriptType === "p2wpkh") {
    const result = payments.p2wpkh({ pubkey, network }).address;
    if (!result) {
      throw new Error("Failed to derive source p2wpkh address.");
    }
    return result;
  }

  const result = payments.p2pkh({ pubkey, network }).address;
  if (!result) {
    throw new Error("Failed to derive source p2pkh address.");
  }
  return result;
};

const buildSendPsbt = async (params: {
  wallet: Wallet;
  destinationAddress: BitcoinAddress;
  amountSats: Sats;
  feeLevel: FeeLevelType;
}): Promise<Result<BuiltSendPsbt, string>> => {
  const btcNetwork = BITCOIN_NETWORK_BY_NAME[params.wallet.network];

  const connectionConfig = ElectrumClient.getConnectionConfig(params.wallet.network);
  const client = new ElectrumClient(connectionConfig.host, connectionConfig.port);

  try {
    // TODO: check candidate addresses and fetch all UTXOs on this wallet
    const accountNode = bip32.fromBase58(params.wallet.xpub, btcNetwork);
    const sourceNode = accountNode.derive(0).derive(0);
    const sourcePubkey = Buffer.from(sourceNode.publicKey);
    const sourceDerivationPath = `${getAccountPath(params.wallet.network, params.wallet.scriptType)}/0/0`;
    const sourceAddress = getAddressFromPubkey(sourcePubkey, btcNetwork, params.wallet.scriptType);
    // TODO: replace the temporary 0/0 fixed source/change address with automatic wallet address selection.
    const changeAddress = sourceAddress;

    await client.connect();

    const feeRateSatsPerVbyte = await client.estimateFee(params.feeLevel);
    const feeRate = Math.max(MIN_FEE_RATE_SATS_PER_VBYTE, satsToNumber(feeRateSatsPerVbyte));

    const utxos = (await client.listUnspent(sourceAddress, btcNetwork)).map(
      (utxo): SpendableUtxo => ({
        txId: utxo.tx_hash,
        vout: utxo.tx_pos,
        value: utxo.value,
        address: sourceAddress,
        pubkey: sourcePubkey,
        derivationPath: sourceDerivationPath,
      }),
    );
    if (utxos.length === 0) {
      return Err("No spendable UTXOs were found for this wallet.");
    }

    const coinSelectInputs: SpendableUtxo[] = utxos;
    const coinSelectTargets: CoinSelectOutput[] = [
      {
        address: params.destinationAddress,
        value: satsToNumber(params.amountSats),
      },
    ];

    const { inputs, outputs, fee } = coinSelect(
      coinSelectInputs,
      coinSelectTargets,
      feeRate,
    ) as CoinSelectResult;

    if (!inputs || !outputs) {
      return Err("coinselect could not find a valid input set.");
    }
    const selectedInputs = inputs as SpendableUtxo[];

    const psbt = new Psbt({ network: btcNetwork });
    for (const input of selectedInputs) {
      const rawTransactionHex = await client.getTransaction(input.txId, false);
      psbt.addInput({
        hash: input.txId,
        index: input.vout,
        nonWitnessUtxo: Buffer.from(rawTransactionHex, "hex"),
        bip32Derivation: [
          {
            masterFingerprint: Buffer.from(params.wallet.fingerprint, "hex"),
            path: input.derivationPath,
            pubkey: input.pubkey,
          },
        ],
      });
    }

    for (const output of outputs) {
      psbt.addOutput({
        address: output.address ?? changeAddress,
        value: output.value,
      });
    }

    const selectedAmountSats = toSats(selectedInputs.reduce((sum, input) => sum + BigInt(input.value), 0n));
    const changeAmountSats = toSats(
      BigInt(outputs.find((output) => output.address === undefined)?.value ?? 0),
    );

    return Ok({
      psbt,
      sourceAddress,
      destinationAddress: params.destinationAddress,
      amountSats: params.amountSats,
      feeRateSatsPerVbyte: feeRate,
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

const getCreatePsbtSummaryMessages = (params: {
  sourceAddress: string;
  destinationAddress: string;
  amountSats: Sats;
  feeRateSatsPerVbyte: number;
  estimatedFeeSats: Sats;
  selectedAmountSats: Sats;
  changeAmountSats: Sats;
}): string[] => {
  return [
    "Create PSBT",
    `Source: ${params.sourceAddress}`,
    `Destination: ${params.destinationAddress}`,
    `Amount: ${params.amountSats.toString()} sats (${satsToBtc(params.amountSats)} BTC)`,
    `Fee rate: ${params.feeRateSatsPerVbyte} sat/vB`,
    `Estimated fee: ${params.estimatedFeeSats.toString()} sats`,
    `Selected input amount: ${params.selectedAmountSats.toString()} sats`,
    `Change: ${params.changeAmountSats.toString()} sats`,
  ];
};

export const executeCreatePsbt = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  const paymentParams = await askPaymentParams(state.wallet.network);

  const buildSendPsbtResult = await buildSendPsbt({
    wallet: state.wallet,
    destinationAddress: paymentParams.destinationAddress,
    amountSats: paymentParams.amountSats,
    feeLevel: paymentParams.feeLevel,
  });
  if (!buildSendPsbtResult.isOk) {
    await askErrorConfirmation(buildSendPsbtResult.error);
    return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }

  const continueSend = await askConfirmation({
    mode: "y/n",
    messages: getCreatePsbtSummaryMessages(buildSendPsbtResult.value),
  });
  if (!continueSend) {
    return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }

  await askConfirmation({
    mode: "enter",
    messages: ["Unsigned PSBT created.", "", buildSendPsbtResult.value.psbt.toBase64()],
  });

  return { screen: AppScreen.WalletMenu, wallet: state.wallet };
};
