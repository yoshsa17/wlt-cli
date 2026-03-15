import { createRequire } from "node:module";
import { hasWallet, type AppState } from "../../state.js";
import { cyan, prefixLines } from "../../utils/terminal.js";

type PackageJson = {
  version: string;
};

const require = createRequire(import.meta.url);
const packageJson = require("../../../package.json") as PackageJson;
const rawVersion = packageJson.version.trim();
const APP_NAME = "WLT CLI";
const APP_VERSION = `v${rawVersion}`;

export const renderHeader = (context: AppState): void => {
  const lines = [cyan(`${APP_NAME} ${APP_VERSION}`)];

  if (hasWallet(context)) {
    lines.push(`Wallet: ${context.wallet.name}`);
  }

  console.log(prefixLines(lines.join("\n"), `${cyan("│")} `));
  console.log("");
};
