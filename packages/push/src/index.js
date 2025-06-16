import Command from "@zhihaoo/command";
import {
  ConfigManager,
  Logger,
  GitUtils,
  ErrorHandler,
  ZhgitError,
  ERROR_CODES,
  safeExecute,
  withRetry,
  shouldRetryNetworkError,
  CommitAnalyzer,
} from "@zhihaoo/utils";
import ora from "ora";
import dayjs from "dayjs";
import { Octokit } from "@octokit/rest";
import fetch from "node-fetch";

const spinner = ora({
  text: "加载中...",
  spinner: {
    frames: [
      "🥝",
      "🍊",
      "🍋",
      "🍇",
      "🍉",
      "🍍",
      "🍒",
      "🍑",
      "🍐",
      "🍏",
      "🍓",
      "🍆",
      "🌽",
      "🥦",
      "🥑",
      "🍄",
      "🫑",
      "🏵️",
      "🌻",
    ],
    interval: 300,
  },
  prefixText: "【zhgit】",
});

class PushCommand extends Command {
  constructor(instance) {
    super(instance);
  }

  get command() {
    return "push [branch_name]";
  }

  get description() {
    return "推送代码到 branch_name 分支";
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

      // 检查是否有 Token
      if (!ConfigManager.existedToken()) {
        throw new ZhgitError(
          "请先设置 GitHub Token: zhgit config <your-token>",
          ERROR_CODES.AUTH_TOKEN_MISSING
        );
      }

      // 获取并验证 Token
      if (!this.token || !this.octokit) {
        this.token = await ConfigManager.getToken();
        this.octokit = new Octokit({
          auth: this.token,
          request: {
            fetch: fetch,
            timeout: 30000, // 30秒超时
          },
        });
      }
    } catch (error) {
      const zhgitError = ErrorHandler.handle(error, "preAction");
      ErrorHandler.displayError(zhgitError);
      throw zhgitError;
    }
  }

  /**
   * 推送代码到目标分支
   * @param {Array} params - [branch, opts]
   */
  async action([branch, opts]) {
    try {
      await safeExecute(async () => {
        // 验证目标分支
        const validBranch = ["dev", "release", "main"];
        if (!validBranch.includes(branch)) {
          throw new ZhgitError(
            `目标分支仅支持 ${validBranch.join(", ")}`,
            ERROR_CODES.INVALID_INPUT
          );
        }

        // 检查工作区状态
        if (!GitUtils.isWorkingDirectoryClean()) {
          throw new ZhgitError(
            "工作区有未提交的更改，请先提交或暂存更改",
            ERROR_CODES.GIT_DIRTY_WORKING_DIR
          );
        }

        // 获取用户信息和当前分支
        const username = GitUtils.getUsername();
        const currentBranch = GitUtils.getCurrentBranch();

        Logger.info(`当前分支: ${currentBranch}`);
        Logger.info(`目标分支: ${branch}`);
        Logger.info(`用户: ${username}`);

        const isMergeBranch = currentBranch.includes(`-to-${branch}-`);

        await this.processPush(branch, username, currentBranch, isMergeBranch);
      }, "push操作");
    } catch (error) {
      if (error instanceof ZhgitError) {
        ErrorHandler.displayError(error);
      } else {
        const zhgitError = ErrorHandler.handle(error, "push操作");
        ErrorHandler.displayError(zhgitError);
      }
      process.exit(1);
    }
  }

  /**
   * 处理推送逻辑
   */
  async processPush(branch, username, currentBranch, isMergeBranch) {
    let newBranch = currentBranch;

    if (!isMergeBranch) {
      // 生成新分支名
      spinner.start(`生成新分支名...`);
      const timestamp = dayjs().format("YYYYMMDDHHmmss");
      newBranch = GitUtils.generateSafeBranchName(
        `${username}-push-${currentBranch}-to-${branch}`,
        timestamp
      );

      // 检查分支名冲突
      if (GitUtils.branchExists(newBranch)) {
        throw new ZhgitError(
          `分支 ${newBranch} 已存在，请稍后重试`,
          ERROR_CODES.GIT_BRANCH_EXISTS
        );
      }
      spinner.succeed(`新分支名: ${newBranch}`);

      // 创建并切换到新分支
      await this.createAndSwitchBranch(newBranch);

      // 拉取目标分支最新代码
      await this.fetchTargetBranch(branch);

      // 合并目标分支
      await this.mergeTargetBranch(branch, newBranch);
    }

    // 推送分支
    await this.pushBranch(newBranch);

    // 创建 PR
    await this.createPullRequest(newBranch, branch, currentBranch);

    // 切换回原分支
    await this.switchBackToOriginalBranch(currentBranch);
  }

  /**
   * 创建并切换到新分支
   */
  async createAndSwitchBranch(branchName) {
    return await safeExecute(async () => {
      spinner.start(`创建并切换到新分支...`);
      GitUtils.createAndCheckoutBranch(branchName);
      spinner.succeed(`已切换到新分支: ${branchName}`);
    }, "创建分支");
  }

  /**
   * 拉取目标分支最新代码
   */
  async fetchTargetBranch(branch) {
    const retryFetch = withRetry(
      3,
      2000,
      shouldRetryNetworkError
    )(async () => {
      return await safeExecute(async () => {
        spinner.start(`正在拉取 ${branch} 分支最新代码...`);
        GitUtils.fetchBranch(branch);
        spinner.succeed("拉取成功");
      }, "拉取远程分支");
    });
    return await retryFetch.call(this);
  }

  /**
   * 合并目标分支
   */
  async mergeTargetBranch(branch, newBranch) {
    return await safeExecute(async () => {
      spinner.start(`正在合并 ${branch} 代码...`);
      GitUtils.mergeBranch(`origin/${branch}`);
      spinner.succeed(`合并成功`);
    }, "合并分支").catch((error) => {
      spinner.fail(`合并失败`);

      if (error.code === ERROR_CODES.GIT_MERGE_CONFLICT) {
        Logger.info("🔧 合并冲突解决指南:");
        Logger.info("1. 手动解决冲突文件中的冲突标记");
        Logger.info("2. git add .");
        Logger.info('3. git commit -m "resolve conflicts"');
        Logger.info(`4. zhgit push ${branch} (重新执行推送)`);
        process.exit(1);
      }

      throw error;
    });
  }

  /**
   * 推送分支到远程
   */
  async pushBranch(branchName) {
    const retryPush = withRetry(
      3,
      2000,
      shouldRetryNetworkError
    )(async () => {
      return await safeExecute(async () => {
        spinner.start(`正在推送到 GitHub...`);
        GitUtils.pushBranch(branchName, true);
        spinner.succeed(`推送完成`);
      }, "推送分支");
    });
    return await retryPush.call(this);
  }

  /**
   * 切换回原分支
   */
  async switchBackToOriginalBranch(originalBranch) {
    return await safeExecute(async () => {
      spinner.start(`切换回原分支...`);
      GitUtils.checkoutBranch(originalBranch);
      spinner.succeed(`已切换回: ${originalBranch}`);
    }, "切换分支");
  }

  /**
   * 创建 Pull Request，包含智能提交分析
   */
  async createPullRequest(sourceBranch, targetBranch, originalBranch) {
    return await safeExecute(async () => {
      spinner.start(`正在创建 PR...`);

      // 获取仓库信息
      const { owner, repo } = GitUtils.parseRemoteUrl();

      // 分析提交历史
      const commitAnalysis = await CommitAnalyzer.analyzeCommits(
        sourceBranch,
        targetBranch,
        originalBranch
      );

      // 生成 PR 描述
      const prBody = CommitAnalyzer.generatePRDescription(
        commitAnalysis,
        sourceBranch,
        targetBranch
      );

      // 生成 PR 标题
      const prTitle = this.generatePRTitle(
        sourceBranch,
        targetBranch,
        commitAnalysis
      );

      // 创建 PR
      const { data: pullRequest } = await this.octokit.pulls.create({
        owner,
        repo,
        title: prTitle,
        body: prBody,
        head: sourceBranch,
        base: targetBranch,
      });

      spinner.succeed(`PR 创建成功`);
      Logger.success(`\n🎉 PR 创建成功!`);
      Logger.success(`📋 标题: ${prTitle}`);
      Logger.success(`🔗 链接: ${pullRequest.html_url}`);
      Logger.success(`📊 ${commitAnalysis.summary}`);

      return pullRequest;
    }, "创建PR");
  }

  /**
   * 生成 PR 标题
   */
  generatePRTitle(sourceBranch, targetBranch, commitAnalysis) {
    const { currentCommits, previousCommits } = commitAnalysis;

    // 如果只有当前提交，使用第一个提交的消息作为标题
    if (currentCommits.length > 0 && previousCommits.length === 0) {
      const firstCommit = currentCommits[0];
      return `${firstCommit.message} → ${targetBranch}`;
    }

    // 如果有多个提交，使用通用格式
    const totalCommits = currentCommits.length + previousCommits.length;
    return `合并 ${sourceBranch} 到 ${targetBranch} (${totalCommits} 个提交)`;
  }
}

function Push(instance) {
  return new PushCommand(instance);
}

export default Push;
