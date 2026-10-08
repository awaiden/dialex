import pc from "picocolors";

export const logger = {
  info: (msg: string) => console.log(pc.blue("ℹ ") + msg),
  success: (msg: string) => console.log(pc.green("✔ ") + pc.bold(msg)),
  warn: (msg: string) => console.warn(pc.yellow("⚠ ") + msg),
  error: (msg: string) => console.error(pc.red("✖ ") + pc.bold(msg)),
  log: (msg: string) => console.log(msg),
};
