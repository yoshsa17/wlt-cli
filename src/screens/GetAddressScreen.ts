import { AppScreen, type AppState } from "../state.js";
import { askGetAddressInput } from "./prompts/askGetAddressInput.js";
import { pause } from "./prompts/pause.js";

const parseNonNegativeInteger = (name: string, value: string): number => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer.`);
  }
  return parsed;
};

export const executeGetAddressScreen = async (state: AppState): Promise<AppState> => {
  if (!state.wallet) {
    return { screen: AppScreen.Start };
  }

  const answer = await askGetAddressInput();
  const change = parseNonNegativeInteger("branch", answer.branch);
  if (change !== 0 && change !== 1) {
    throw new Error("branch must be 0 (receive) or 1 (change).");
  }

  const index = parseNonNegativeInteger("index", answer.index);
  const address = state.wallet.deriveAddress(index, change);

  console.log("");
  console.log(`Address [branch=${change}, index=${index}]`);
  console.log(address);

  await pause();
  return { ...state, screen: AppScreen.WalletMenu };
};
