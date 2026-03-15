import { AppScreen, hasWallet, type AppState } from "../../state.js";
import { pause } from "../common/pause.js";
import QRCode from "qrcode";

export const executeShowXpubQr = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  const qrString = await QRCode.toString(state.wallet.xpub, {
    type: "terminal",
    small: true,
    errorCorrectionLevel: "M",
  });
  console.log(qrString);
  await pause();

  return { screen: AppScreen.Settings, wallet: state.wallet };
};
