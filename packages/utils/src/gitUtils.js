import { execSync, spawn } from "child_process";
import { Logger } from "./index.js";

/**
 * 安全的 Git 操作工具类
 * 防止命令注入，提供统一的 Git 操作接口
 */
export class GitUtils {
  /**
   * 安全执行 Git 命令
   * @param {string[]} args - Git 命令参数数组
   * @param {Object} options - 执行选项
   * @returns {string} 命令输出
   */
  static execGitCommand(args, options = {}) {
    // 验证参数安全性
    if (!Array.isArray(args)) {
      throw new Error("Git 命令参数必须是数组");
    }

    // 过滤危险字符
    const sanitizedArgs = args.map((arg) => {
      if (typeof arg !== "string") {
        throw new Error("Git 命令参数必须是字符串");
      }
      // 检查是否包含危险字符
      if (
        arg.includes(";") ||
        arg.includes("|") ||
        arg.includes("&") ||
        arg.includes("`")
      ) {
        throw new Error(`Git 命令参数包含危险字符: ${arg}`);
      }
      return arg.trim();
    });

    const command = ["git", ...sanitizedArgs].join(" ");

    try {
      const result = execSync(command, {
        encoding: "utf8",
        timeout: options.timeout || 30000, // 30秒超时
        maxBuffer: options.maxBuffer || 1024 * 1024, // 1MB 缓冲区
        ...options,
      });
      return result.toString().trim();
    } catch (error) {
      Logger.error(`Git 命令执行失败: ${command}`);
      Logger.error(`错误信息: ${error.message}`);
      throw new Error(`Git 操作失败: ${error.message}`);
    }
  }

  /**
   * 检查是否在 Git 仓库中
   * @returns {boolean}
   */
  static isGitRepository() {
    try {
      this.execGitCommand(["rev-parse", "--git-dir"]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查工作区是否干净
   * @returns {boolean}
   */
  static isWorkingDirectoryClean() {
    try {
      const status = this.execGitCommand(["status", "--porcelain"]);
      return status.length === 0;
    } catch {
      return false;
    }
  }

  /**
   * 获取当前分支名
   * @returns {string}
   */
  static getCurrentBranch() {
    return this.execGitCommand(["rev-parse", "--abbrev-ref", "HEAD"]);
  }

  /**
   * 获取用户名
   * @returns {string}
   */
  static getUsername() {
    return this.execGitCommand(["config", "--global", "user.name"]);
  }

  /**
   * 获取用户邮箱
   * @returns {string}
   */
  static getUserEmail() {
    return this.execGitCommand(["config", "--global", "user.email"]);
  }

  /**
   * 检查分支是否存在
   * @param {string} branchName - 分支名
   * @param {boolean} isRemote - 是否检查远程分支
   * @returns {boolean}
   */
  static branchExists(branchName, isRemote = false) {
    try {
      const prefix = isRemote ? "origin/" : "";
      this.execGitCommand(["rev-parse", "--verify", `${prefix}${branchName}`]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 获取远程仓库 URL
   * @returns {string}
   */
  static getRemoteUrl() {
    return this.execGitCommand(["remote", "get-url", "origin"]);
  }

  /**
   * 解析远程仓库信息
   * @returns {Object} {owner, repo, platform}
   */
  static parseRemoteUrl() {
    const remoteUrl = this.getRemoteUrl();

    // GitHub SSH 格式: git@github.com:owner/repo.git
    // GitHub HTTPS 格式: https://github.com/owner/repo.git
    // GitLab 类似格式

    let owner, repo, platform;

    if (remoteUrl.includes("github.com")) {
      platform = "github";
      if (remoteUrl.startsWith("git@")) {
        const match = remoteUrl.match(/git@github\.com:(.+)\/(.+)\.git/);
        if (match) {
          [, owner, repo] = match;
        }
      } else if (remoteUrl.startsWith("https://")) {
        const match = remoteUrl.match(/https:\/\/github\.com\/(.+)\/(.+)\.git/);
        if (match) {
          [, owner, repo] = match;
        }
      }
    } else if (remoteUrl.includes("gitlab.com")) {
      platform = "gitlab";
      // 类似的 GitLab 解析逻辑
    }

    if (!owner || !repo) {
      throw new Error(`无法解析远程仓库信息: ${remoteUrl}`);
    }

    return { owner, repo, platform };
  }

  /**
   * 拉取远程分支
   * @param {string} branch - 分支名
   */
  static fetchBranch(branch) {
    this.execGitCommand(["fetch", "origin", branch]);
  }

  /**
   * 创建并切换到新分支
   * @param {string} branchName - 新分支名
   * @param {string} baseBranch - 基础分支，默认为当前分支
   */
  static createAndCheckoutBranch(branchName, baseBranch = null) {
    if (this.branchExists(branchName)) {
      throw new Error(`分支 ${branchName} 已存在`);
    }

    const args = ["checkout", "-b", branchName];
    if (baseBranch) {
      args.push(baseBranch);
    }

    this.execGitCommand(args);
  }

  /**
   * 切换分支
   * @param {string} branchName - 分支名
   */
  static checkoutBranch(branchName) {
    this.execGitCommand(["checkout", branchName]);
  }

  /**
   * 合并分支
   * @param {string} branchName - 要合并的分支名
   */
  static mergeBranch(branchName) {
    this.execGitCommand(["merge", branchName]);
  }

  /**
   * 推送分支到远程
   * @param {string} branchName - 分支名
   * @param {boolean} setUpstream - 是否设置上游分支
   */
  static pushBranch(branchName, setUpstream = false) {
    const args = ["push"];
    if (setUpstream) {
      args.push("-u");
    }
    args.push("origin", branchName);

    this.execGitCommand(args);
  }

  /**
   * 获取两个分支之间的提交差异
   * @param {string} baseBranch - 基础分支
   * @param {string} headBranch - 目标分支
   * @returns {Array} 提交列表
   */
  static getCommitsDiff(baseBranch, headBranch) {
    const output = this.execGitCommand([
      "log",
      `${baseBranch}..${headBranch}`,
      "--pretty=format:%H|%s|%an|%ae|%ad",
      "--date=iso",
    ]);

    if (!output) return [];

    return output.split("\n").map((line) => {
      const [hash, message, author, email, date] = line.split("|");
      return {
        hash,
        message,
        author,
        email,
        date: new Date(date),
      };
    });
  }

  /**
   * 验证分支名是否合法
   * @param {string} branchName - 分支名
   * @returns {boolean}
   */
  static isValidBranchName(branchName) {
    // Git 分支名规则
    const invalidChars = /[~^:?*[\\\s]/;
    const invalidPatterns = /^-|\.\.|\.$|^\.|\/@\{|@\{/;

    return (
      !invalidChars.test(branchName) &&
      !invalidPatterns.test(branchName) &&
      branchName.length > 0 &&
      branchName.length <= 255
    );
  }

  /**
   * 生成安全的分支名
   * @param {string} baseName - 基础名称
   * @param {string} suffix - 后缀
   * @returns {string}
   */
  static generateSafeBranchName(baseName, suffix = "") {
    // 清理基础名称
    let safeName = baseName
      .replace(/[~^:?*[\\\s]/g, "-")
      .replace(/\.+/g, ".")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    if (suffix) {
      safeName += `-${suffix}`;
    }

    // 确保长度不超过限制
    if (safeName.length > 200) {
      safeName = safeName.substring(0, 200);
    }

    return safeName;
  }
}
