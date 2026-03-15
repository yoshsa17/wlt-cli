#!/usr/bin/env node

import { AppScreen, type AppScreen as AppScreenType, type AppState } from "./state.js";
import { executeCreateWallet } from "./screens/CreateWalletScreen.js";
import { executeGetAddressScreen } from "./screens/GetAddressScreen.js";
import { executeSettings } from "./screens/SettingsScreen.js";
import { executeSignPsbt } from "./screens/SignPsbtScreen.js";
import { executeStart } from "./screens/StartScreen.js";
import { executeWalletHome } from "./screens/WalletHomeScreen.js";
import { renderHeader } from "./screens/ui/header.js";
import { clearScreen } from "./utils/terminal.js";

type ScreenExecutor = (state: AppState) => Promise<AppState>;

const screenExecutors: Partial<Record<AppScreenType, ScreenExecutor>> = {
  [AppScreen.Start]: executeStart,
  [AppScreen.CreateWallet]: executeCreateWallet,
  [AppScreen.WalletMenu]: executeWalletHome,
  [AppScreen.GetAddress]: executeGetAddressScreen,
  [AppScreen.Settings]: executeSettings,
  [AppScreen.SignPsbt]: executeSignPsbt,
};

const run = async (appState: AppState): Promise<void> => {
  let state = appState;

  while (state.screen !== AppScreen.Exit) {
    clearScreen();
    renderHeader(state);

    // render main screen
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
