import { AppScreen, hasWallet, type AppState } from "../../state.js";
import { bold, dim, indent } from "../../utils/terminal.js";
import { askAddressesAction, AddressesAction } from "./askAddressesAction.js";
import { askAddressesInput } from "./askAddressesInput.js";

export const executeGetAddress = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  console.log(indent(bold("Addresses\n")));

  const answer = await askAddressesInput();
  const address = state.wallet.deriveAddress(answer.index, answer.branch);

  console.log("");
  console.log(indent(dim(`Address [branch=${answer.branch}, index=${answer.index}]`)));
  console.log(indent(bold(address)));
  console.log("");

  const addressesAction = await askAddressesAction();
  switch (addressesAction) {
    case AddressesAction.ShowQr:
      return { screen: AppScreen.ShowAddressQr, wallet: state.wallet, address };
    case AddressesAction.Back:
    default:
      return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  }
};
