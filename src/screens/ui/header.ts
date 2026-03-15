import { createRequire } from "node:module";
import type { AppState } from "../../state.js";

type PackageJson = {
  name?: string;
  version?: string;
};

const require = createRequire(import.meta.url);
const packageJson = require("../../../package.json") as PackageJson;
const rawVersion = packageJson.version?.trim() || "0.0.0";

const formatAppName = (name: string): string => {
  const normalized = name.trim().replace(/[-_]+/g, " ");
  return normalized.length === 0 ? "WLT CLI" : normalized.toUpperCase();
};

const APP_NAME = formatAppName(packageJson.name?.trim() || "wlt-cli");
const APP_VERSION = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;
const APP_CONTEXT = process.env.WLT_CONTEXT?.trim();
const HEADER_WIDTH = 64;

const ANSI = {
  reset: "\u001b[0m",
  cyan: "\u001b[36m",
};

const SUPPORTS_COLOR = process.stdout.isTTY && process.env.NO_COLOR !== "1";

const paint = (text: string): string => {
  if (!SUPPORTS_COLOR) {
    return text;
  }
  return `${ANSI.cyan}${text}${ANSI.reset}`;
};

const fitText = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 1) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 1)}…`;
};

const printHeaderLine = (content: string): void => {
  console.log(`${paint("│")} ${content}`);
};

const formatInfoLine = (label: string, value: string): string => {
  const labelBlock = `${label}:`.padEnd(10);
  const valueWidth = Math.max(1, HEADER_WIDTH - labelBlock.length);
  return `${labelBlock}${fitText(value, valueWidth)}`;
};

export const renderHeader = (context: AppState): void => {
  const rows: Array<{ label: string; value: string }> = [];

  if (context.wallet) {
    rows.push({ label: "Network", value: context.wallet.network.toUpperCase() });
  }
  if (APP_CONTEXT) {
    rows.push({ label: "Context", value: APP_CONTEXT });
  }
  if (context.wallet) {
    rows.push({ label: "Wallet", value: context.wallet.name });
  }

  printHeaderLine(paint(fitText(`${APP_NAME} ${APP_VERSION}`, HEADER_WIDTH)));
  for (const row of rows) {
    printHeaderLine(formatInfoLine(row.label, row.value));
  }
  console.log("");
};
