import Command from "@zh/command";
import { execSync } from "child_process";
import { ConfigManager, Logger } from "@zh/utils";
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

  preAction() {
    if (!ConfigManager.existedToken()) throw "请先设置 github token";

    if (!this.token || !this.octokit) {
      this.token = ConfigManager.getToken();
      this.octokit = new Octokit({
        auth: this.token,
        request: {
          fetch: fetch,
        },
      });
    }
  }

  /**
   * branch 是目标分支
   * @param {*} param0
   */
  async action([branch, opts]) {
    const validBranch = ["dev", "release", "main"];

    if (!validBranch.includes(branch)) {
      Logger.error(`目标分支仅支持 ${validBranch.join(", ")}`);
      return;
    }

    const username = execSync("git config --global user.name")
      .toString()
      .trim();

    const currentBranch = execSync("git rev-parse --abbrev-ref HEAD")
      .toString()
      .trim();

    const isMergeBranch = currentBranch.includes(`-to-${branch}-`);

    let newBranch = currentBranch;
    if (!isMergeBranch) {
      // 创建新的分支

      spinner.start(`创建新分支...`);
      newBranch = `${username}-push-${currentBranch}-to-${branch}-${dayjs().format(
        "YYYYMMDDHHmmss"
      )}`;
      spinner.succeed(`新分支创建成功: ${newBranch}`);

      // 切换到新分支
      spinner.start(`切换到新分支...`);
      execSync(`git checkout -b ${newBranch}`);
      spinner.succeed(`切换到新分支: ${newBranch}`);

      try {
        spinner.start(`正在拉取 ${branch} 分支最新代码...`);
        execSync(`git fetch origin ${branch}`);
        spinner.succeed("拉取成功");
      } catch (e) {
        spinner.fail("拉取失败");
        throw e;
      }

      // 合并分支
      try {
        spinner.start(`正在合并 ${branch} 代码`);
        execSync(`git merge origin/${branch}`);
        spinner.succeed(`合并成功`);
      } catch (error) {
        spinner.fail(`合并失败, ${error}`);
        Logger.info("合并有冲突, 请先解决冲突, 然后:");
        Logger.info("1. git add .");
        Logger.info('2. git commit -m "resolve conflicts"');
        Logger.info(`3. zhgit push origin ${newBranch}  (注意: 提交用 zhgit)`);
        process.exit(1);
      }
    }

    // 推送到远程分支
    try {
      spinner.start(`正在推送到 github ...`);
      execSync(`git push origin ${newBranch}`);
      spinner.succeed(`推送完成`);
    } catch (error) {
      spinner.fail(`推送失败`);
      throw error;
    }

    // 创建 pr

    try {
      spinner.start(`正在创建 PR ...`);
      await this.createPullRequest(newBranch, branch);
      spinner.succeed(`PR 创建成功 `);

      execSync(`git checkout ${currentBranch}`);
    } catch (error) {
      spinner.fail(`PR 创建失败 ❌`);
      console.error(error);
    }
  }

  async createPullRequest(sourceBranch, targetBranch) {
    try {
      // 从配置文件获取 token
      const token = process.env.GITHUB_TOKEN; // 或从配置文件读取

      // 获取仓库信息
      const remoteUrl = execSync("git remote get-url origin").toString().trim();
      const [owner, repo] = remoteUrl
        .replace("git@github.com:", "")
        .replace(".git", "")
        .split("/");

      // 获取提交差异
      const compareResult = await this.octokit.repos.compareCommits({
        owner,
        repo,
        base: `${targetBranch}`,
        head: sourceBranch,
      });

      // 生成提交信息摘要
      const commits = compareResult.data.commits;
      let prBody = "## Commits\n\n";
      commits.forEach((commit) => {
        prBody += `- ${commit.commit.message}\n`;
      });

      // 创建 PR
      const {
        data: pullRequest,
        status,
        message,
      } = await this.octokit.pulls.create({
        owner,
        repo,
        title: `Merge ${sourceBranch} into ${targetBranch}`,
        body: prBody,
        head: sourceBranch,
        base: targetBranch,
      });

      if (![200, 201].includes(status)) {
        throw new Error(`创建 pr 失败: ${status} ${message}`);
      }

      Logger.success(`\n✅ PR 创建成功: ${pullRequest.html_url}`);
    } catch (error) {
      Logger.error("Failed to create PR:", error.message);
    }
  }
}

function Push(instance) {
  return new PushCommand(instance);
}

export default Push;
