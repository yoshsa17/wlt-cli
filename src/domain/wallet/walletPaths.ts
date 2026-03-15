import type { NetworkName, ScriptType } from "./Wallet.js";
import { COIN_TYPE_BY_NETWORK } from "./network.js";

const SCRIPT_PURPOSE: Record<ScriptType, 44 | 84> = {
  p2pkh: 44,
  p2wpkh: 84,
};

export const getScriptPurpose = (scriptType: ScriptType): 44 | 84 => {
  return SCRIPT_PURPOSE[scriptType];
};

export const getAccountPath = (
  network: NetworkName,
  scriptType: ScriptType,
): string => {
  const purpose = getScriptPurpose(scriptType);
  const coinType = COIN_TYPE_BY_NETWORK[network];
  return `m/${purpose}'/${coinType}'/0'`;
};
