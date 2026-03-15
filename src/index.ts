#!/usr/bin/env node

import { AppScreen, type AppScreen as AppScreenType, type AppState } from "./state.js";
import { executeBroadcast } from "./screens/Broadcast/BroadcastScreen.js";
import { executeGetAddress } from "./screens/GetAddress/GetAddressScreen.js";
import { executeShowAddressQr } from "./screens/GetAddress/ShowAddressQrScreen.js";
import { renderHeader } from "./screens/common/header.js";
import { executeCreateWallet } from "./screens/CreateWallet/CreateWalletScreen.js";
import { executeCreatePsbt } from "./screens/Send/SendScreen.js";
import { executeSettings } from "./screens/Settings/SettingsScreen.js";
import { executeShowXpubQr } from "./screens/Settings/ShowXpubQrScreen.js";
import { executeSignPsbt } from "./screens/SignPsbt/SignPsbtScreen.js";
import { executeStart } from "./screens/Start/StartScreen.js";
import { executeWalletMenu } from "./screens/WalletMenu/WalletMenuScreen.js";
import { clearScreen } from "./utils/terminal.js";

type ScreenExecutor = (state: AppState) => Promise<AppState>;

const screenExecutors: Partial<Record<AppScreenType, ScreenExecutor>> = {
  [AppScreen.Start]: executeStart,
  [AppScreen.CreateWallet]: executeCreateWallet,
  [AppScreen.WalletMenu]: executeWalletMenu,
  [AppScreen.CreatePsbt]: executeCreatePsbt,
  [AppScreen.Broadcast]: executeBroadcast,
  [AppScreen.Addresses]: executeGetAddress,
  [AppScreen.Settings]: executeSettings,
  [AppScreen.ShowAddressQr]: executeShowAddressQr,
  [AppScreen.ShowXpubQr]: executeShowXpubQr,
  [AppScreen.SignPsbt]: executeSignPsbt,
};

const run = async (appState: AppState): Promise<void> => {
  let state = appState;

  while (state.screen !== AppScreen.Exit) {
    clearScreen();
    renderHeader(state);

    const executeScreen = screenExecutors[state.screen];
    if (!executeScreen) {
      throw new Error(`No executor configured for screen "${state.screen}".`);
    }

    state = await executeScreen(state);
  }
};

// Entry point
try {
  await run({ screen: AppScreen.Start });
} catch (err) {
  if (err instanceof Error && (err.message.includes("SIGINT") || err.name === "ExitPromptError")) {
    console.log("");
    process.exit(0);
  }
  throw err;
}
