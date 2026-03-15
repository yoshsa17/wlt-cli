import { AppScreen, hasAddress, type AppState } from "../../state.js";
import { pause } from "../common/pause.js";
import * as QRCode from "qrcode";

export const executeShowAddressQr = async (state: AppState): Promise<AppState> => {
  if (!hasAddress(state)) {
    return { screen: AppScreen.Start };
  }

  const qrString = await QRCode.toString(state.address, {
    type: "terminal",
    small: true,
    errorCorrectionLevel: "M",
  });
  console.log(qrString);
  await pause();

  return { screen: AppScreen.WalletMenu, wallet: state.wallet };
};
