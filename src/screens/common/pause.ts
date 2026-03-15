import { input } from "@inquirer/prompts";

export const pause = async (): Promise<void> => {
  await input({ message: "Press Enter to return" });
};
