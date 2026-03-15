const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  dim: "\x1b[2m",
} as const;

const canUseAnsi = (): boolean => {
  return process.stdout.isTTY && process.env.NO_COLOR !== "1";
};

const colorize = (text: string, color: (typeof ANSI)[keyof typeof ANSI]): string => {
  if (!canUseAnsi()) {
    return text;
  }

  return `${color}${text}${ANSI.reset}`;
};

const mapLines = (text: string, mapLine: (line: string) => string): string => {
  return text.split("\n").map(mapLine).join("\n");
};

/**
 * Clear the terminal when running in an interactive TTY.
 */
export const clearScreen = (): void => {
  if (process.stdout.isTTY) {
    console.clear();
  }
};

/**
 * Wrap text in ANSI when rendering in the terminal.
 */
export const red = (text: string): string => colorize(text, ANSI.red);
export const cyan = (text: string): string => colorize(text, ANSI.cyan);
export const bold = (text: string): string => colorize(text, ANSI.bold);
export const dim = (text: string): string => colorize(text, ANSI.dim);

/**
 * Add left padding to each line in a text block.
 */
export const indent = (text: string, size = 1): string => {
  const padding = " ".repeat(size);
  return mapLines(text, (line) => `${padding}${line}`);
};

/**
 * Prefix each line in a text block with the same marker.
 */
export const prefixLines = (text: string, prefix: string): string => {
  return mapLines(text, (line) => `${prefix}${line}`);
};
