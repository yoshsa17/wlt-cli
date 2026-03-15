import { askConfirmation } from "./askConfirmation.js";
import { red } from "../../utils/terminal.js";

export const askErrorConfirmation = async (errorMessage: string): Promise<void> => {
  await askConfirmation({ mode: "enter", messages: [red(errorMessage)] });
};
