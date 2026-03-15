import { Psbt } from "bitcoinjs-lib";
import { ElectrumClient } from "../../services/ElectrumClient.js";
import { AppScreen, hasWallet, type AppState } from "../../state.js";
import { BITCOIN_NETWORK_BY_NAME } from "../../domain/wallet/network.js";
import { askConfirmation } from "../common/askConfirmation.js";
import { askErrorConfirmation } from "../common/askErrorConfirmation.js";
import { askPsbtBase64 } from "../common/askPsbtBase64.js";

export const executeBroadcast = async (state: AppState): Promise<AppState> => {
  if (!hasWallet(state)) {
    return { screen: AppScreen.Start };
  }

  const psbtBase64 = await askPsbtBase64();

  let psbt: Psbt;
  try {
    psbt = Psbt.fromBase64(psbtBase64.trim(), {
      network: BITCOIN_NETWORK_BY_NAME[state.wallet.network],
    });
  } catch (error) {
    await askErrorConfirmation(error instanceof Error ? error.message : "PSBT is invalid.");
    return { screen: AppScreen.Broadcast, wallet: state.wallet };
  }

  const connectionConfig = ElectrumClient.getConnectionConfig(state.wallet.network);
  const client = new ElectrumClient(connectionConfig.host, connectionConfig.port);

  try {
    const rawTransactionHex = psbt.extractTransaction().toHex();

    await client.connect();
    const txid = await client.broadcast(rawTransactionHex);

    await askConfirmation({
      mode: "enter",
      messages: ["Transaction broadcasted.", `Txid: ${txid}`],
    });

    return { screen: AppScreen.WalletMenu, wallet: state.wallet };
  } catch (error) {
    await askErrorConfirmation(error instanceof Error ? error.message : "Broadcast failed.");
    return { screen: AppScreen.Broadcast, wallet: state.wallet };
  } finally {
    client.close();
  }
};
