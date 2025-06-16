import os from "os";
import path from "path";
import fs from "fs";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import fetch from "node-fetch";
import keytar from "keytar";
import { Logger } from ".";
import { GitUtils } from "./gitUtils.js";
import { ErrorHandler, ERROR_CODES, ZhgitError } from "./errorHandler.js";

export default class ConfigManager {
  static CONFIG_FILE = path.join(os.homedir(), ".zhihaorc");
  static SERVICE_NAME = "zhgit-cli";

  static getConfig() {
    /**
     * {
     *    zhgit: {
     *      [name]: {
     *        // 基本配置信息，不包含敏感数据
     *        email: "",
     *        lastUsed: "",
     *        preferences: {}
     *      }
     *    }
     * }
     */
    try {
      const configData = fs.readFileSync(this.CONFIG_FILE, "utf8");
      return JSON.parse(configData);
    } catch (error) {
      if (error.code === "ENOENT") {
        // 配置文件不存在，返回空配置
        return {};
      }
      throw new ZhgitError(
        `读取配置文件失败: ${error.message}`,
        ERROR_CODES.CONFIG_INVALID,
        { filePath: this.CONFIG_FILE }
      );
    }
  }

  static saveConfig(config) {
    try {
      // 确保配置目录存在
      const configDir = path.dirname(this.CONFIG_FILE);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // 设置安全的文件权限（仅用户可读写）
      fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2), {
        mode: 0o600,
      });
    } catch (error) {
      throw new ZhgitError(
        `保存配置文件失败: ${error.message}`,
        ERROR_CODES.CONFIG_INVALID,
        { filePath: this.CONFIG_FILE }
      );
    }
  }

  static async saveToken(token, username) {
    try {
      // 验证 Token 有效性
      const validation = await this.validateGithubToken(token);
      if (!validation.valid) {
        throw new ZhgitError(
          `Token 验证失败: ${validation.error}`,
          ERROR_CODES.AUTH_TOKEN_INVALID
        );
      }

      // 使用系统密钥库安全存储 Token
      await keytar.setPassword(this.SERVICE_NAME, username, token);

      // 更新配置文件（不包含敏感信息）
      const config = this.getConfig();
      if (!config.zhgit) {
        config.zhgit = {};
      }

      if (!config.zhgit[username]) {
        config.zhgit[username] = {};
      }

      config.zhgit[username].email = validation.email || "";
      config.zhgit[username].lastUsed = new Date().toISOString();
      config.zhgit[username].hasToken = true;

      this.saveConfig(config);
      Logger.success(`Token 已安全保存到系统密钥库`);
    } catch (error) {
      if (error instanceof ZhgitError) {
        throw error;
      }
      throw new ZhgitError(
        `保存 Token 失败: ${error.message}`,
        ERROR_CODES.CONFIG_INVALID
      );
    }
  }

  static existedToken() {
    try {
      const username = GitUtils.getUsername();
      const config = this.getConfig();
      return !!config.zhgit?.[username]?.hasToken;
    } catch (error) {
      Logger.debug(`检查 Token 存在性失败: ${error.message}`);
      return false;
    }
  }

  static async getToken() {
    try {
      const username = GitUtils.getUsername();

      // 从系统密钥库获取 Token
      const token = await keytar.getPassword(this.SERVICE_NAME, username);

      if (!token) {
        throw new ZhgitError(
          "未找到 GitHub Token，请先使用 zhgit config 设置",
          ERROR_CODES.AUTH_TOKEN_MISSING
        );
      }

      return token;
    } catch (error) {
      if (error instanceof ZhgitError) {
        throw error;
      }
      throw new ZhgitError(
        `获取 Token 失败: ${error.message}`,
        ERROR_CODES.AUTH_TOKEN_MISSING
      );
    }
  }

  static async removeToken(username = null) {
    try {
      const user = username || GitUtils.getUsername();

      // 从系统密钥库删除 Token
      await keytar.deletePassword(this.SERVICE_NAME, user);

      // 更新配置文件
      const config = this.getConfig();
      if (config.zhgit?.[user]) {
        config.zhgit[user].hasToken = false;
        delete config.zhgit[user].email;
        this.saveConfig(config);
      }

      Logger.success("Token 已删除");
    } catch (error) {
      throw new ZhgitError(
        `删除 Token 失败: ${error.message}`,
        ERROR_CODES.CONFIG_INVALID
      );
    }
  }

  static async validateGithubToken(token) {
    try {
      const octokit = new Octokit({
        auth: token,
        request: {
          fetch: fetch,
          timeout: 10000, // 10秒超时
        },
      });

      const { data } = await octokit.users.getAuthenticated();

      // 检查 Token 权限
      const scopes = await this.checkTokenScopes(octokit);

      return {
        valid: true,
        username: data.login,
        email: data.email,
        scopes: scopes,
        hasRequiredPermissions: this.hasRequiredPermissions(scopes),
      };
    } catch (error) {
      Logger.debug(`Token 验证失败: ${error.message}`);

      let errorMessage = error.message;
      if (error.status === 401) {
        errorMessage = "Token 无效或已过期";
      } else if (error.status === 403) {
        errorMessage = "Token 权限不足";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage = "网络连接超时";
      }

      return {
        valid: false,
        error: errorMessage,
      };
    }
  }

  static async checkTokenScopes(octokit) {
    try {
      // 通过一个简单的 API 调用来检查权限
      const response = await octokit.request("GET /user");
      const scopes = response.headers["x-oauth-scopes"] || "";
      return scopes
        .split(",")
        .map((scope) => scope.trim())
        .filter(Boolean);
    } catch (error) {
      Logger.debug(`检查 Token 权限失败: ${error.message}`);
      return [];
    }
  }

  static hasRequiredPermissions(scopes) {
    // 检查是否有必要的权限
    const requiredScopes = ["repo", "public_repo"];
    return requiredScopes.some((required) =>
      scopes.some((scope) => scope.includes(required))
    );
  }

  static getUserPreferences(username = null) {
    try {
      const user = username || GitUtils.getUsername();
      const config = this.getConfig();
      return config.zhgit?.[user]?.preferences || {};
    } catch (error) {
      Logger.debug(`获取用户偏好设置失败: ${error.message}`);
      return {};
    }
  }

  static saveUserPreferences(preferences, username = null) {
    try {
      const user = username || GitUtils.getUsername();
      const config = this.getConfig();

      if (!config.zhgit) {
        config.zhgit = {};
      }

      if (!config.zhgit[user]) {
        config.zhgit[user] = {};
      }

      config.zhgit[user].preferences = {
        ...config.zhgit[user].preferences,
        ...preferences,
      };

      this.saveConfig(config);
    } catch (error) {
      throw new ZhgitError(
        `保存用户偏好设置失败: ${error.message}`,
        ERROR_CODES.CONFIG_INVALID
      );
    }
  }
}
