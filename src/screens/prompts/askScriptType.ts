import { select } from "@inquirer/prompts";
import { ScriptType, type ScriptType as ScriptTypeValue } from "../../types/wallet.js";
import { MINIMAL_LIST_THEME } from "./promptTheme.js";

export const askScriptType = async (
  defaultValue: ScriptTypeValue = ScriptType.P2wpkh,
): Promise<ScriptTypeValue> => {
  return select<ScriptTypeValue>({
    message: "Select script type",
    default: defaultValue,
    theme: MINIMAL_LIST_THEME,
    choices: [
      { name: "P2PKH (legacy)", value: ScriptType.P2pkh },
      { name: "P2WPKH (native segwit)", value: ScriptType.P2wpkh },
    ],
  });
};
