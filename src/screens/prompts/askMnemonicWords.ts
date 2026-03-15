import * as bip39 from "bip39";
import { parseMnemonic, type Mnemonic } from "../../domain/mnemonic.js";
import { adaptInquirerJsValidator } from "../../utils/promptValidator.js";
import { mnemonicWordsInput } from "./custom/mnemonicWordsInput.js";

type WordCount = 12 | 24;
const MAX_WORD_LENGTH = 8; // BIP39 English word list has max length of 8 chars
const BIP39_ENGLISH_WORD_SET = new Set(bip39.wordlists.english);

const validateWord = (word: string): boolean | string => {
  if (word.length === 0) {
    return "Word is required.";
  }
  if (word.length > MAX_WORD_LENGTH) {
    return `Each word must be ${MAX_WORD_LENGTH} characters or fewer.`;
  }
  if (/\s/.test(word)) {
    return "Enter one word at a time.";
  }
  if (!BIP39_ENGLISH_WORD_SET.has(word)) {
    return "Word is not in BIP39 dictionary.";
  }
  return true;
};

export const askMnemonicWords = async (wordCount: WordCount): Promise<Mnemonic> => {
  const result = await mnemonicWordsInput({
    wordCount,
    validateWord: validateWord,
    validateMnemonic: adaptInquirerJsValidator(parseMnemonic),
  });

  // TODO: If the mnemonic was generated instead of typed manually, ask for confirmation before returning it.
  const parsedMnemonic = parseMnemonic(result.mnemonic);
  if (!parsedMnemonic.isOk) {
    throw new Error(parsedMnemonic.error);
  }

  return parsedMnemonic.value;
};
