import * as bitcoin from "bitcoinjs-lib";
import type { NetworkName } from "../../types/wallet.js";

export const BITCOIN_NETWORK_BY_NAME: Readonly<Record<NetworkName, bitcoin.Network>> = {
  mainnet: bitcoin.networks.bitcoin,
  regtest: bitcoin.networks.regtest,
  testnet: bitcoin.networks.testnet,
};

export const COIN_TYPE_BY_NETWORK: Readonly<Record<NetworkName, 0 | 1>> = {
  mainnet: 0,
  regtest: 1,
  testnet: 1,
};
