import Command from "@zhihaoo/command";
import {
  ConfigManager,
  Logger,
  GitUtils,
  ErrorHandler,
  ZhgitError,
  ERROR_CODES,
  safeExecute,
} from "@zhihaoo/utils";

class ConfigCommand extends Command {
  get command() {
    return "config [token]";
  }

  get description() {
    return "设置开发者的配置信息";
  }

  async action([token, opts]) {
    try {
      await safeExecute(async () => {
        // 验证输入
        if (!token) {
          throw new ZhgitError(
            "请输入 GitHub Token",
            ERROR_CODES.INVALID_INPUT
          );
        }

        // 检查是否在 Git 仓库中
        if (!GitUtils.isGitRepository()) {
          throw new ZhgitError(
            '请在 Git 仓库中执行此命令，或先配置全局用户名: git config --global user.name "your-name"',
            ERROR_CODES.GIT_NOT_REPOSITORY
          );
        }

        // 获取用户名
        const username = GitUtils.getUsername();
        Logger.info(`配置用户: ${username}`);

        // 验证并保存 Token
        Logger.info("正在验证 GitHub Token...");
        await ConfigManager.saveToken(token, username);

        Logger.success("🎉 配置完成！现在可以使用 zhgit push 命令了");
      }, "config操作");
    } catch (error) {
      if (error instanceof ZhgitError) {
        ErrorHandler.displayError(error);
      } else {
        const zhgitError = ErrorHandler.handle(error, "config操作");
        ErrorHandler.displayError(zhgitError);
      }
      process.exit(1);
    }
  }
}

export default function Config(instance) {
  return new ConfigCommand(instance);
}
