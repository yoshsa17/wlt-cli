const ANSI = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
} as const;

/**
 * Clear the terminal when running in an interactive TTY.
 */
export const clearScreen = (): void => {
  if (process.stdout.isTTY) {
    console.clear();
  }
};

/**
 * Wrap text in ANSI red when rendering in the terminal.
 */
export const red = (text: string): string => {
  return `${ANSI.red}${text}${ANSI.reset}`;
};

/**
 * Wrap text in ANSI dim when rendering in an interactive terminal.
 */
export const dim = (text: string): string => {
  if (!process.stdout.isTTY || process.env.NO_COLOR === "1") {
    return text;
  }

  return `${ANSI.dim}${text}${ANSI.reset}`;
};
