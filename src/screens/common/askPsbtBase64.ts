import { input } from "@inquirer/prompts";

export const askPsbtBase64 = async (): Promise<string> => {
  return input({
    message: "PSBT (base64)",
    validate: (value: string) => {
      const normalizedValue = value.trim();
      if (normalizedValue.length === 0) {
        return "PSBT is required";
      }

      return true;
    },
  });
};
