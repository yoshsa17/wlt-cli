import { input, select } from "@inquirer/prompts";
import type { BitcoinAddress } from "../../domain/valueObject/bitcoinAddress.js";
import { parseSatsFromBtc } from "../../domain/valueObject/btc.js";
import type { Sats } from "../../domain/valueObject/sats.js";
import { parseBitcoinAddress } from "../../domain/valueObject/bitcoinAddress.js";
import type { NetworkName } from "../../domain/wallet/Wallet.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";
import type { ValueOf } from "../../types/utils.js";

export const FeeLevel = {
  Low: "LOW",
  Medium: "MEDIUM",
  High: "HIGH",
} as const;
export type FeeLevel = ValueOf<typeof FeeLevel>;

export type PaymentParams = {
  destinationAddress: BitcoinAddress;
  amountSats: Sats;
  feeLevel: FeeLevel;
};

export const askPaymentParams = async (network: NetworkName): Promise<PaymentParams> => {
  const destinationAddress = await input({
    message: "Pay to",
    validate: adaptInquirerJsValidator((value) => parseBitcoinAddress(value, network)),
  });

  const amountBtcValue = await input({
    message: "Amount (BTC)",
    validate: adaptInquirerJsValidator(parseSatsFromBtc),
  });

  const feeLevel = await select({
    message: "Fee level",
    choices: [
      { name: "Low", value: FeeLevel.Low },
      { name: "Medium", value: FeeLevel.Medium },
      { name: "High", value: FeeLevel.High },
    ],
  });

  const destinationAddressResult = parseBitcoinAddress(destinationAddress, network);
  if (!destinationAddressResult.isOk) {
    throw new Error(destinationAddressResult.error);
  }

  const amountSatsResult = parseSatsFromBtc(amountBtcValue);
  if (!amountSatsResult.isOk) {
    throw new Error(amountSatsResult.error);
  }

  return {
    destinationAddress: destinationAddressResult.value,
    amountSats: amountSatsResult.value,
    feeLevel,
  };
};
