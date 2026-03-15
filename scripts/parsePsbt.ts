import { address, networks, opcodes, Psbt, script, Transaction, type Network } from "bitcoinjs-lib";

const PSBT_BASE64 =
  "cHNidP8BAHcCAAAAAQoNwMysTfhfO43uJMt1bZNh3gAQa3LPvBeNWgcZPuYYAAAAAAD/////AhAnAAAAAAAAGXapFKhMzlgaPfiGRRdZATnCH7vBe+91iKyNRwIAAAAAABl2qRQT9WsCm9M6tRVxauTn3wYYMfveVoisAAAAAAABAOQCAAAAAAEBKwPD7/xpNIz9Z5IyTaVQlZhZy3Qv1++5izirxCgJMVIBAAAAAP3///8CNXkCAAAAAAAZdqkUE/VrApvTOrUVcWrk598GGDH73laIrIBxGI4AAAAAGXapFDFSgiWxpT69+At6B2k7hCBdpR3YiKwCRzBEAiBklu0ZETLMftFth1ZeeKsJBxGCtr4YUwHBE54XbnSwbwIgOZqTgLyXQqP9hz9dEnmfnPtnCUfew3fN5tXIHQ/1huQBIQIXPPOGFkTrS7PrGAEniC3hL8Ftqsp+ulDd3jRzGnfvXR1fSgAAAAA=";

const tryGetAddress = (scriptBuffer: Buffer): string | null => {
  const supportedNetworks: Network[] = [networks.testnet];

  for (const network of supportedNetworks) {
    try {
      return address.fromOutputScript(scriptBuffer, network);
    } catch {
      // Try the next supported network.
    }
  }

  return null;
};

const toHex = (value: Buffer | Uint8Array | undefined): string | undefined => {
  return value ? Buffer.from(value).toString("hex") : undefined;
};

const formatScriptOps = (scriptBuffer: Buffer): string[] => {
  const chunks = script.decompile(scriptBuffer);
  if (!chunks) {
    return [];
  }

  return chunks.map((chunk) => {
    if (typeof chunk === "number") {
      const opcodeName = Object.entries(opcodes).find(([, opcodeValue]) => opcodeValue === chunk)?.[0];
      return opcodeName ?? `OP_${chunk}`;
    }

    return Buffer.from(chunk).toString("hex");
  });
};

const getInputValue = (psbt: Psbt, inputIndex: number): number | undefined => {
  const input = psbt.data.inputs[inputIndex];

  if (input?.witnessUtxo) {
    return input.witnessUtxo.value;
  }

  if (input?.nonWitnessUtxo) {
    const previousTransaction = Transaction.fromBuffer(input.nonWitnessUtxo);
    return previousTransaction.outs[psbt.txInputs[inputIndex].index]?.value;
  }

  return undefined;
};

const getPrevoutSummary = (scriptBuffer: Buffer, value: number) => {
  return {
    value,
    address: tryGetAddress(scriptBuffer),
    scriptHex: scriptBuffer.toString("hex"),
    scriptOps: formatScriptOps(scriptBuffer),
  };
};

const main = (): void => {
  const psbt = Psbt.fromBase64(PSBT_BASE64);

  const inputs = psbt.txInputs.map((input, inputIndex) => {
    const psbtInput = psbt.data.inputs[inputIndex];
    const txId = Buffer.from(input.hash).reverse().toString("hex");
    const witnessUtxo = psbtInput?.witnessUtxo
      ? getPrevoutSummary(psbtInput.witnessUtxo.script, psbtInput.witnessUtxo.value)
      : undefined;

    let nonWitnessUtxo;
    if (psbtInput?.nonWitnessUtxo) {
      const previousTransaction = Transaction.fromBuffer(psbtInput.nonWitnessUtxo);
      const previousOutput = previousTransaction.outs[input.index];

      nonWitnessUtxo = {
        txHex: psbtInput.nonWitnessUtxo.toString("hex"),
        txId: previousTransaction.getId(),
        output: previousOutput ? getPrevoutSummary(previousOutput.script, previousOutput.value) : undefined,
      };
    }

    return {
      inputIndex,
      txId,
      vout: input.index,
      sequence: input.sequence,
      value: getInputValue(psbt, inputIndex),
      finalScriptSig: toHex(psbtInput?.finalScriptSig),
      finalScriptWitness: toHex(psbtInput?.finalScriptWitness),
      redeemScript: toHex(psbtInput?.redeemScript),
      witnessScript: toHex(psbtInput?.witnessScript),
      sighashType: psbtInput?.sighashType,
      partialSignatures:
        psbtInput?.partialSig?.map((signature) => ({
          pubkey: signature.pubkey.toString("hex"),
          signature: signature.signature.toString("hex"),
        })) ?? [],
      bip32Derivations:
        psbtInput?.bip32Derivation?.map((derivation) => ({
          masterFingerprint: Buffer.from(derivation.masterFingerprint).toString("hex"),
          path: derivation.path,
          pubkey: derivation.pubkey.toString("hex"),
        })) ?? [],
      tapBip32Derivations:
        psbtInput?.tapBip32Derivation?.map((derivation) => ({
          masterFingerprint: Buffer.from(derivation.masterFingerprint).toString("hex"),
          path: derivation.path,
          pubkey: derivation.pubkey.toString("hex"),
          leafHashes: derivation.leafHashes.map((leafHash) => leafHash.toString("hex")),
        })) ?? [],
      tapInternalKey: toHex(psbtInput?.tapInternalKey),
      tapKeySig: toHex(psbtInput?.tapKeySig),
      tapLeafScript:
        psbtInput?.tapLeafScript?.map((leafScript) => ({
          controlBlock: leafScript.controlBlock.toString("hex"),
          leafVersion: leafScript.leafVersion,
          scriptHex: leafScript.script.toString("hex"),
          scriptOps: formatScriptOps(leafScript.script),
        })) ?? [],
      witnessUtxo,
      nonWitnessUtxo,
      unknownKeyValues:
        psbtInput?.unknownKeyVals?.map((keyValue) => ({
          key: keyValue.key.toString("hex"),
          value: keyValue.value.toString("hex"),
        })) ?? [],
    };
  });

  const outputs = psbt.txOutputs.map((output, outputIndex) => {
    const psbtOutput = psbt.data.outputs[outputIndex];

    return {
      outputIndex,
      value: output.value,
      address: tryGetAddress(output.script),
      scriptHex: output.script.toString("hex"),
      scriptOps: formatScriptOps(output.script),
      redeemScript: toHex(psbtOutput?.redeemScript),
      witnessScript: toHex(psbtOutput?.witnessScript),
      bip32Derivations:
        psbtOutput?.bip32Derivation?.map((derivation) => ({
          masterFingerprint: Buffer.from(derivation.masterFingerprint).toString("hex"),
          path: derivation.path,
          pubkey: derivation.pubkey.toString("hex"),
        })) ?? [],
      tapBip32Derivations:
        psbtOutput?.tapBip32Derivation?.map((derivation) => ({
          masterFingerprint: Buffer.from(derivation.masterFingerprint).toString("hex"),
          path: derivation.path,
          pubkey: derivation.pubkey.toString("hex"),
          leafHashes: derivation.leafHashes.map((leafHash) => leafHash.toString("hex")),
        })) ?? [],
      tapInternalKey: toHex(psbtOutput?.tapInternalKey),
      unknownKeyValues:
        psbtOutput?.unknownKeyVals?.map((keyValue) => ({
          key: keyValue.key.toString("hex"),
          value: keyValue.value.toString("hex"),
        })) ?? [],
    };
  });

  const totalInput = inputs.reduce((sum, input) => sum + (input.value ?? 0), 0);
  const hasAllInputValues = inputs.every((input) => input.value !== undefined);
  const totalOutput = outputs.reduce((sum, output) => sum + output.value, 0);

  console.log(
    JSON.stringify(
      {
        base64: PSBT_BASE64,
        base64DecodedHex: Buffer.from(PSBT_BASE64, "base64").toString("hex"),
        inputCount: psbt.inputCount,
        outputCount: psbt.txOutputs.length,
        version: psbt.version,
        locktime: psbt.locktime,
        totalInput: hasAllInputValues ? totalInput : null,
        totalOutput,
        fee: hasAllInputValues ? totalInput - totalOutput : null,
        inputs,
        outputs,
      },
      null,
      2,
    ),
  );
};

main();
