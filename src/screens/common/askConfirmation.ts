import { confirm, input } from "@inquirer/prompts";

export type ConfirmationMode = "enter" | "y/n";

type ConfirmationOptions = {
  mode: ConfirmationMode;
  messages: string[];
};

export const askConfirmation = async ({ mode, messages }: ConfirmationOptions): Promise<boolean> => {
  console.log("");

  for (const line of messages) {
    console.log(line);
  }

  console.log("");

  if (mode === "enter") {
    await input({ message: "Press Enter to continue" });
    return true;
  }

  return confirm({ message: "Do you want to continue?", default: false });
};
