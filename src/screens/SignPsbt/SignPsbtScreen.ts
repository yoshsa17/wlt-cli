import { address, Psbt, Transaction } from "bitcoinjs-lib";
import { satsToBtc, toSats, type Sats } from "../../domain/valueObject/sats.js";
import { SoftwareKeySource } from "../../domain/keySource/SoftwareKeySource.js";
import { BITCOIN_NETWORK_BY_NAME } from "../../domain/wallet/network.js";
import type { NetworkName } from "../../domain/wallet/Wallet.js";
import { AppScreen, hasWallet, type AppState } from "../../state.js";
import type { Result } from "../../types/utils.js";
import { Err, Ok } from "../../utils/result.js";
import { askConfirmation } from "../common/askConfirmation.js";
import { askErrorConfirmation } from "../common/askErrorConfirmation.js";
import { askPsbtBase64 } from "../common/askPsbtBase64.js";

const parsePsbtBase64 = (psbtBase64: string, networkName: NetworkName): Result<Psbt> => {
  try {
    return Ok(
      Psbt.fromBase64(psbtBase64.trim(), {
        network: BITCOIN_NETWORK_BY_NAME[networkName],
      }),
    );
  } catch (error) {
    if (error instanceof Error) {
      return Err(`PSBT is invalid. ${error.message}`);
    }

    return Err("PSBT is invalid.");
  }
};

const getInputValue = (psbt: Psbt, inputIndex: number): Sats | undefined => {
  const psbtInput = psbt.data.inputs[inputIndex];
  if (psbtInput?.witnessUtxo) {
    return toSats(BigInt(psbtInput.witnessUtxo.value));
  }
  if (psbtInput?.nonWitnessUtxo) {
    const previousTransaction = Transaction.fromBuffer(psbtInput.nonWitnessUtxo);
    const value = previousTransaction.outs[psbt.txInputs[inputIndex].index]?.value;
    return value === undefined ? undefined : toSats(BigInt(value));
  }

  return undefined;
};

const getOutputAddress = (psbt: Psbt, outputIndex: number, networkName: NetworkName): string => {
  try {
    return address.fromOutputScript(psbt.txOutputs[outputIndex].script, BITCOIN_NETWORK_BY_NAME[networkName]);
  } catch {
    return psbt.txOutputs[outputIndex].script.toString("hex");
  }
};

const formatSats = (value: Sats): string => {
  return `${value.toString()} sats (${satsToBtc(value)} BTC)`;
};

const formatSummaryValue = (value: Sats | undefined): string => {
  return value === undefined ? "unknown" : formatSats(value);
};

const getPsbtSummaryMessages = (psbt: Psbt, networkName: NetworkName): string[] => {
  const messages = ["Parsed PSBT", `Inputs: ${psbt.inputCount}`, `Outputs: ${psbt.txOutputs.length}`];

  let totalInputValue = toSats(0n);
  let hasAllInputValues = true;
  messages.push("");
  messages.push("Inputs");

  psbt.txInputs.forEach((input, inputIndex) => {
    const txid = Buffer.from(input.hash).reverse().toString("hex");
    const value = getInputValue(psbt, inputIndex);
    if (value === undefined) {
      hasAllInputValues = false;
    } else {
      totalInputValue = toSats(totalInputValue + value);
    }

    messages.push(
      `${inputIndex + 1}. ${txid}:${input.index}${value === undefined ? "" : ` ${formatSats(value)}`}`,
    );
  });

  let totalOutputValue = toSats(0n);
  messages.push("");
  messages.push("Outputs");
  psbt.txOutputs.forEach((output, outputIndex) => {
    totalOutputValue = toSats(totalOutputValue + BigInt(output.value));
    messages.push(
      `${outputIndex + 1}. ${getOutputAddress(psbt, outputIndex, networkName)} ${formatSats(toSats(BigInt(output.value)))}`,
    );
  });

  messages.push("");
  messages.push(`Total input: ${formatSummaryValue(hasAllInputValues ? totalInputValue : undefined)}`);
  messages.push(`Total output: ${formatSats(totalOutputValue)}`);
  messages.push(
    `Fee: ${formatSummaryValue(hasAllInputValues ? toSats(totalInputValue - totalOutputValue) : undefined)}`,
  );

  return messages;
};

export const executeSignPsbt = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }
  if (state.wallet.keySourceData.type !== "software") {
    await askErrorConfirmation("No local signing secret is available for this wallet.");
    return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }

  const psbtBase64 = await askPsbtBase64();
  const psbtParseResult = parsePsbtBase64(psbtBase64, state.wallet.network);
  if (!psbtParseResult.isOk) {
    await askErrorConfirmation(psbtParseResult.error);
    return { screen: AppScreen.SignPsbt, wallet: state.wallet };
  }

  const shouldSign = await askConfirmation({
    mode: "y/n",
    messages: getPsbtSummaryMessages(psbtParseResult.value, state.wallet.network),
  });
  if (!shouldSign) {
    return { screen: AppScreen.SignPsbt, wallet: state.wallet };
  }

  const keySource = new SoftwareKeySource(state.wallet.keySourceData.mnemonic);
  const signedPsbtResult = await keySource.signPsbt(
    psbtParseResult.value,
    state.wallet.scriptType,
    state.wallet.network,
  );
  if (!signedPsbtResult.isOk) {
    await askErrorConfirmation(signedPsbtResult.error);
    return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }

  try {
    signedPsbtResult.value.finalizeAllInputs();
  } catch (error) {
    if (error instanceof Error) {
      await askErrorConfirmation(error.message);
      return { screen: AppScreen.WalletMenu, wallet: state.wallet };
    }

    throw error;
  }

  await askConfirmation({
    mode: "enter",
    messages: ["Signed and finalized PSBT (base64)", signedPsbtResult.value.toBase64()],
  });

  return { screen: AppScreen.WalletMenu, wallet: state.wallet };
};
