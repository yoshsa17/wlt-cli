import {
  createPrompt,
  isEnterKey,
  makeTheme,
  Theme,
  useKeypress,
  usePrefix,
  useState,
  type Status,
} from "@inquirer/core";
import * as bip39 from "bip39";
import type { PartialDeep } from "@inquirer/type";
import type { InquirerJsValidator } from "../../../types/utils.js";

type MnemonicWordsInputResult = {
  mnemonic: string;
};

type MnemonicWordsInputTheme = {
  style: {
    error: (text: string) => string;
  };
};

type WordCount = 12 | 24;

type MnemonicWordsInputConfig = {
  wordCount: WordCount;
  validateWord: InquirerJsValidator;
  validateMnemonic: InquirerJsValidator;
  theme?: PartialDeep<Theme<MnemonicWordsInputTheme>>;
};

const CLEAR_COMMAND = "/clear";
const GENERATE_COMMAND = "/gen";
const IMPORT_COMMAND = "/import";
const MAX_WORD_LENGTH = 8; // BIP39 English word list has max length of 8 chars
const SLOT_WIDTH = MAX_WORD_LENGTH + 2; // Add some padding for readability
const TWO_COLUMN_GAP = "          ";

const mnemonicWordsInputTheme: PartialDeep<Theme<MnemonicWordsInputTheme>> = {
  style: {
    error: (text: string) => makeTheme().style.error(text).replace("> ", ""), // remove prefix on error message
  },
};

const createEmptyWords = (wordCount: WordCount): string[] => Array.from({ length: wordCount }, () => "");

const createMnemonicSlots = (words: string[], wordCount: WordCount): string => {
  if (words.length > wordCount) {
    throw new Error(`words length must be <= ${wordCount}.`);
  }

  const rowCount = 6;
  const colCount = Math.ceil(wordCount / rowCount);
  const lines: string[] = [];

  for (let row = 0; row < rowCount; row++) {
    const columns: string[] = [];

    for (let col = 0; col < colCount; col++) {
      const index = row + col * rowCount;

      const word = (words[index] ?? "").slice(0, SLOT_WIDTH);
      const slot = word ? word.padEnd(SLOT_WIDTH, " ") : "_".repeat(SLOT_WIDTH);

      columns.push(`${String(index + 1).padStart(2, "0")}. ${slot}`);
    }

    lines.push(columns.join(TWO_COLUMN_GAP));
  }

  return lines.join("\n");
};

/**
 * TODO:
 * Split the generic word-grid input behavior out of this mnemonic-specific prompt.
 *
 * Custom prompt that renders and validates the mnemonic word grid.
 * For Inquirer.js custom prompt, see: https://github.com/SBoudrias/Inquirer.js/tree/main/packages/core
 */
export const mnemonicWordsInput = createPrompt<MnemonicWordsInputResult, MnemonicWordsInputConfig>(
  (config, done) => {
    const theme = makeTheme<MnemonicWordsInputTheme>(mnemonicWordsInputTheme, config.theme);
    const [status, setStatus] = useState<Status>("idle");
    const prefix = usePrefix({ status, theme });

    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [slotWords, setSlotWords] = useState<string[]>(createEmptyWords(config.wordCount));
    const [inputWord, setInputWord] = useState("");

    const isReadyToImport = slotWords.every((word) => word.length > 0);
    const currentIndex = slotWords.findIndex((word) => word.length === 0);

    const resetState = () => {
      setSlotWords(createEmptyWords(config.wordCount));
      setInputWord("");
      setErrorMessage(null);
    };

    const generateMnemonic = () => {
      const mnemonic = bip39.generateMnemonic(config.wordCount === 12 ? 128 : 256);
      const generatedWords = mnemonic.split(" ");

      setSlotWords(generatedWords);
      setInputWord("");
      setErrorMessage(null);
    };

    const importMnemonic = () => {
      if (slotWords.some((word) => word.length === 0)) {
        setErrorMessage(`Enter ${config.wordCount} words.`);
        return;
      }

      const mnemonic = slotWords.join(" ");
      const validationResult = config.validateMnemonic(mnemonic);
      if (validationResult !== true) {
        setErrorMessage(typeof validationResult === "string" ? validationResult : "Invalid mnemonic.");
        return;
      }

      setStatus("done");
      done({ mnemonic });
    };

    useKeypress((key, rl) => {
      if (status !== "idle") {
        return;
      }

      if (!isEnterKey(key)) {
        setInputWord(rl.line);
        setErrorMessage(null);
        return;
      }

      const trimmed = inputWord.trim().toLowerCase();

      if (isReadyToImport) {
        if (trimmed === IMPORT_COMMAND) {
          importMnemonic();
          return;
        }

        setInputWord("");
        setErrorMessage(
          `Type ${IMPORT_COMMAND} to import, ${GENERATE_COMMAND} to generate new mnemonic, or ${CLEAR_COMMAND} to reset all words.`,
        );
        return;
      }

      if (trimmed === CLEAR_COMMAND) {
        resetState();
        return;
      }

      if (trimmed === GENERATE_COMMAND) {
        generateMnemonic();
        return;
      }

      const validationResult = config.validateWord(trimmed);
      if (validationResult !== true) {
        setInputWord("");
        setErrorMessage(typeof validationResult === "string" ? validationResult : "Invalid word.");
        return;
      }

      const nextWords = [...slotWords];
      nextWords[currentIndex] = trimmed;
      setSlotWords(nextWords);
      setInputWord("");
      setErrorMessage(null);
    });

    const heading = `${prefix} Mnemonic words (BIP39 ${config.wordCount})`.trim();
    const slots = createMnemonicSlots(slotWords, config.wordCount);

    if (status === "done") {
      return heading;
    }

    const helper = theme.style.help(
      isReadyToImport
        ? `Type ${IMPORT_COMMAND} to import, ${GENERATE_COMMAND} to generate new mnemonic, or ${CLEAR_COMMAND} to reset all words.`
        : `Type one mnemonic word and press Enter. Type ${GENERATE_COMMAND} to generate all words, or type ${CLEAR_COMMAND} to reset all words.`,
    );
    const inputLine = `> ${inputWord}`;
    const error = errorMessage ? theme.style.error(errorMessage) : undefined;
    return [[heading, slots, helper, inputLine].filter(Boolean).join("\n\n"), error];
  },
);
