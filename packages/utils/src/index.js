import chalk from "chalk";
import ConfigManager from "./config.js";

class Logger {
  static info(message) {
    console.log(chalk.blue(message));
  }

  static success(message) {
    console.log(chalk.green(`✓ ${message}`));
  }

  static error(message) {
    console.error(chalk.red(`✗ ${message}`));
  }

  static warn(message) {
    console.log(chalk.yellow(message));
  }
}

export { ConfigManager, Logger };
