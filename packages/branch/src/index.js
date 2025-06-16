import Command from "@zhihaoo/command";
import {
  Logger,
  GitUtils,
  ErrorHandler,
  ZhgitError,
  ERROR_CODES,
  safeExecute,
  withRetry,
  shouldRetryNetworkError,
} from "@zhihaoo/utils";
import ora from "ora";
import dayjs from "dayjs";

const spinner = ora({
  text: "加载中...",
  spinner: {
    frames: ["🌱", "🌿", "🍃", "🌳"],
    interval: 300,
  },
  prefixText: "【zhgit】",
});

class BranchCommand extends Command {
  constructor(instance) {
    super(instance);
  }

  get command() {
    return "branch <action> [branch_name]";
  }

  get description() {
    return "智能分支管理 (create|switch|delete|list)";
  }

  get options() {
    return [
      ["-b, --base <branch>", "指定基础分支 (默认: main)", "main"],
      ["-f, --force", "强制操作"],
      ["-r, --remote", "包含远程分支"],
    ];
  }

  async preAction() {
    try {
      // 检查是否在 Git 仓库中
      if (!GitUtils.isGitRepository()) {
        throw new ZhgitError(
          "当前目录不是 Git 仓库，请在 Git 仓库中执行此命令",
          ERROR_CODES.GIT_NOT_REPOSITORY
        );
      }
    } catch (error) {
      const zhgitError = ErrorHandler.handle(error, "branch preAction");
      ErrorHandler.displayError(zhgitError);
      throw zhgitError;
    }
  }

  async action([action, branchName, opts]) {
    try {
      await safeExecute(async () => {
        switch (action) {
          case "create":
          case "c":
            await this.createBranch(branchName, opts);
            break;
          case "switch":
          case "s":
            await this.switchBranch(branchName, opts);
            break;
          case "delete":
          case "d":
            await this.deleteBranch(branchName, opts);
            break;
          case "list":
          case "l":
            await this.listBranches(opts);
            break;
          default:
            throw new ZhgitError(
              `未知操作: ${action}。支持的操作: create, switch, delete, list`,
              ERROR_CODES.INVALID_INPUT
            );
        }
      }, `branch ${action}`);
    } catch (error) {
      if (error instanceof ZhgitError) {
        ErrorHandler.displayError(error);
      } else {
        const zhgitError = ErrorHandler.handle(error, `branch ${action}`);
        ErrorHandler.displayError(zhgitError);
      }
      process.exit(1);
    }
  }

  /**
   * 创建新分支，基于远程最新的 main 分支
   */
  async createBranch(branchName, opts) {
    const baseBranch = opts.base || "main";
    const username = GitUtils.getUsername();

    // 如果没有提供分支名，生成智能分支名
    if (!branchName) {
      branchName = await this.generateSmartBranchName(username);
    }

    // 验证分支名
    if (!GitUtils.isValidBranchName(branchName)) {
      throw new ZhgitError(
        `分支名 "${branchName}" 不符合 Git 分支命名规范`,
        ERROR_CODES.INVALID_BRANCH_NAME
      );
    }

    // 检查分支是否已存在
    if (GitUtils.branchExists(branchName)) {
      if (!opts.force) {
        throw new ZhgitError(
          `分支 "${branchName}" 已存在，使用 --force 强制覆盖`,
          ERROR_CODES.GIT_BRANCH_EXISTS
        );
      }
      Logger.warn(`强制覆盖现有分支: ${branchName}`);
    }

    // 拉取远程基础分支最新代码
    await this.fetchBaseBranch(baseBranch);

    // 创建并切换到新分支
    await this.createAndSwitchBranch(branchName, `origin/${baseBranch}`);

    Logger.success(`🎉 成功创建并切换到分支: ${branchName}`);
    Logger.info(`📍 基于: origin/${baseBranch}`);
  }

  /**
   * 切换分支
   */
  async switchBranch(branchName, opts) {
    if (!branchName) {
      throw new ZhgitError("请指定要切换的分支名", ERROR_CODES.INVALID_INPUT);
    }

    const localExists = GitUtils.branchExists(branchName);
    const remoteExists = GitUtils.branchExists(branchName, true);

    // 如果使用 --force 选项，强制基于远程重新创建
    if (opts.force && remoteExists) {
      if (localExists) {
        Logger.warn(
          `⚠️  本地分支 ${branchName} 已存在，将被删除并基于远程重新创建`
        );

        // 检查是否是当前分支
        const currentBranch = GitUtils.getCurrentBranch();
        if (currentBranch === branchName) {
          // 先切换到 main 分支
          Logger.info("📍 先切换到 main 分支...");
          await this.switchToExistingBranch("main");
        }

        // 删除本地分支
        await safeExecute(async () => {
          spinner.start(`删除本地分支 ${branchName}...`);
          GitUtils.execGitCommand(["branch", "-D", branchName]);
          spinner.succeed(`本地分支 ${branchName} 已删除`);
        }, "删除本地分支");
      }

      Logger.info(`🔄 基于远程分支重新创建: ${branchName}`);
      await this.createAndSwitchBranch(branchName, `origin/${branchName}`);
      Logger.success(`✅ 已基于远程分支切换到: ${branchName}`);
      return;
    }

    // 正常的智能切换逻辑
    if (!localExists) {
      // 检查远程分支是否存在
      if (remoteExists) {
        Logger.info(`本地分支不存在，从远程分支创建: ${branchName}`);
        await this.createAndSwitchBranch(branchName, `origin/${branchName}`);
      } else {
        throw new ZhgitError(
          `分支 "${branchName}" 不存在`,
          ERROR_CODES.GIT_BRANCH_NOT_EXISTS
        );
      }
    } else {
      // 本地分支存在，检查是否需要提示用户可以强制重置
      if (remoteExists && !opts.force) {
        Logger.info(`💡 提示: 如需基于远程分支重新创建，请使用 --force 选项`);
      }
      await this.switchToExistingBranch(branchName);
    }

    Logger.success(`✅ 已切换到分支: ${branchName}`);
  }

  /**
   * 删除分支
   */
  async deleteBranch(branchName, opts) {
    if (!branchName) {
      throw new ZhgitError("请指定要删除的分支名", ERROR_CODES.INVALID_INPUT);
    }

    const currentBranch = GitUtils.getCurrentBranch();
    if (currentBranch === branchName) {
      throw new ZhgitError("不能删除当前所在的分支", ERROR_CODES.INVALID_INPUT);
    }

    if (!GitUtils.branchExists(branchName)) {
      throw new ZhgitError(
        `分支 "${branchName}" 不存在`,
        ERROR_CODES.GIT_BRANCH_NOT_EXISTS
      );
    }

    await safeExecute(async () => {
      spinner.start(`删除分支 ${branchName}...`);
      const deleteFlag = opts.force ? "-D" : "-d";
      GitUtils.execGitCommand(["branch", deleteFlag, branchName]);
      spinner.succeed(`分支 ${branchName} 已删除`);
    }, "删除分支");

    Logger.success(`🗑️ 分支 "${branchName}" 已删除`);
  }

  /**
   * 列出分支
   */
  async listBranches(opts) {
    await safeExecute(async () => {
      spinner.start("获取分支列表...");

      let branches;
      if (opts.remote) {
        branches = GitUtils.execGitCommand(["branch", "-a"]);
      } else {
        branches = GitUtils.execGitCommand(["branch"]);
      }

      spinner.succeed("分支列表");

      Logger.info("\n📋 分支列表:");
      console.log(branches);
    }, "列出分支");
  }

  /**
   * 生成智能分支名
   */
  async generateSmartBranchName(username) {
    const timestamp = dayjs().format("MMDD-HHmm");
    const currentBranch = GitUtils.getCurrentBranch();

    // 基于当前分支和时间戳生成分支名
    let baseName;
    if (currentBranch === "main" || currentBranch === "master") {
      baseName = `${username}-feature-${timestamp}`;
    } else {
      baseName = `${username}-${currentBranch}-${timestamp}`;
    }

    return GitUtils.generateSafeBranchName(baseName);
  }

  /**
   * 拉取基础分支最新代码
   */
  async fetchBaseBranch(baseBranch) {
    const retryFetch = withRetry(
      3,
      2000,
      shouldRetryNetworkError
    )(async () => {
      return await safeExecute(async () => {
        spinner.start(`拉取 ${baseBranch} 分支最新代码...`);
        GitUtils.fetchBranch(baseBranch);
        spinner.succeed(`${baseBranch} 分支代码已更新`);
      }, "拉取基础分支");
    });
    return await retryFetch.call(this);
  }

  /**
   * 创建并切换到新分支
   */
  async createAndSwitchBranch(branchName, baseBranch) {
    return await safeExecute(async () => {
      spinner.start(`创建分支 ${branchName}...`);
      GitUtils.createAndCheckoutBranch(branchName, baseBranch);
      spinner.succeed(`已创建并切换到分支: ${branchName}`);
    }, "创建分支");
  }

  /**
   * 切换到现有分支
   */
  async switchToExistingBranch(branchName) {
    return await safeExecute(async () => {
      spinner.start(`切换到分支 ${branchName}...`);
      GitUtils.checkoutBranch(branchName);
      spinner.succeed(`已切换到分支: ${branchName}`);
    }, "切换分支");
  }
}

function Branch(instance) {
  return new BranchCommand(instance);
}

export default Branch;
