import chalk from "chalk";
import ConfigManager from "./config.js";
import { GitUtils } from "./gitUtils.js";
import {
  ErrorHandler,
  ZhgitError,
  ERROR_CODES,
  withRetry,
  shouldRetryNetworkError,
  safeExecute,
} from "./errorHandler.js";
import { CommitAnalyzer } from "./commitAnalyzer.js";

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

  static debug(message) {
    if (process.env.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`));
    }
  }
}

export {
  ConfigManager,
  Logger,
  GitUtils,
  ErrorHandler,
  ZhgitError,
  ERROR_CODES,
  withRetry,
  shouldRetryNetworkError,
  safeExecute,
  CommitAnalyzer,
};
