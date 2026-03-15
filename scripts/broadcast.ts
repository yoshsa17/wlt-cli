import { Psbt } from "bitcoinjs-lib";
import { createElectrumClient } from "./ElectrumClient.js";

const main = async (): Promise<void> => {
  const host = "blockstream.info";
  const port = 993;
  const psbtBase64 =
    "cHNidP8BAHcCAAAAAQoNwMysTfhfO43uJMt1bZNh3gAQa3LPvBeNWgcZPuYYAAAAAAD/////AhAnAAAAAAAAGXapFKhMzlgaPfiGRRdZATnCH7vBe+91iKyNRwIAAAAAABl2qRQT9WsCm9M6tRVxauTn3wYYMfveVoisAAAAAAABAOQCAAAAAAEBKwPD7/xpNIz9Z5IyTaVQlZhZy3Qv1++5izirxCgJMVIBAAAAAP3///8CNXkCAAAAAAAZdqkUE/VrApvTOrUVcWrk598GGDH73laIrIBxGI4AAAAAGXapFDFSgiWxpT69+At6B2k7hCBdpR3YiKwCRzBEAiBklu0ZETLMftFth1ZeeKsJBxGCtr4YUwHBE54XbnSwbwIgOZqTgLyXQqP9hz9dEnmfnPtnCUfew3fN5tXIHQ/1huQBIQIXPPOGFkTrS7PrGAEniC3hL8Ftqsp+ulDd3jRzGnfvXR1fSgAiAgISnRqqf1+CxK7OacA0Leu7p4aw+pEM9zfWvafr8HK3KUcwRAIgYrIwpLCZaRMHhFuqm5YLJxKz1kr+dxwSwZxexr+jrLECIDSvjMwr3yMilHQ7k64WAhVg+zljkN7SWY5YRNrEW1NOASIGAhKdGqp/X4LErs5pwDQt67unhrD6kQz3N9a9p+vwcrcpGKaE2/MsAACAAQAAgAAAAIAAAAAAAAAAAAAAAA=";

  if (!psbtBase64.trim()) {
    throw new Error("Set psbtBase64 before running the script.");
  }

  const psbt = Psbt.fromBase64(psbtBase64.trim());
  psbt.finalizeAllInputs();
  const rawTransactionHex = psbt.extractTransaction().toHex();

  const client = createElectrumClient(host, port);

  try {
    await client.connect();
    const txid = await client.blockchainTransaction_broadcast(rawTransactionHex.trim());

    console.log(`Broadcasted transaction: ${txid}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Electrum server request failed.");
      console.error(`Host: ${host}:${port}`);
      console.error(`Reason: ${error.message}`);
      return;
    }

    throw error;
  } finally {
    client.close();
  }
};

await main();
