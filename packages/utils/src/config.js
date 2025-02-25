import os from "os";
import path from "path";
import fs from "fs";
import { Octokit } from "@octokit/rest";
import { execSync } from "child_process";
import fetch from "node-fetch";
import { Logger } from ".";

export default class ConfigManager {
  static CONFIG_FILE = path.join(os.homedir(), ".zhihaorc");

  static getConfig() {
    /**
     * {
     *    zhgit: {
     *      [name]: {
     *        prToken: "",
     *      }
     *    }
     * }
     */
    try {
      return JSON.parse(fs.readFileSync(this.CONFIG_FILE, "utf8"));
    } catch {
      return {};
    }
  }

  static saveConfig(config) {
    fs.writeFileSync(this.CONFIG_FILE, JSON.stringify(config, null, 2));
  }

  static saveToken(token, username) {
    // 读取现有配置
    const config = this.getConfig();

    if (!config.zhgit) {
      config.zhgit = {};
    }

    if (!config.zhgit[username]) {
      config.zhgit[username] = {};
    }

    config.zhgit[username].prtoken = token;

    // 保存配置
    this.saveConfig(config);
  }

  static existedToken() {
    const username = execSync("git config --global user.name")
      .toString()
      .trim();

    const config = this.getConfig();

    return !!config.zhgit?.[username]?.prtoken;
  }

  static getToken() {
    const config = this.getConfig();

    const username = execSync("git config --global user.name")
      .toString()
      .trim();

    return config.zhgit?.[username]?.prtoken;
  }

  static async validateGithubToken(token) {
    try {
      const octokit = new Octokit({
        auth: token,
        request: {
          fetch: fetch,
        },
      });
      const { data } = await octokit.users.getAuthenticated();

      return {
        valid: true,
        username: data.login,
      };
    } catch (error) {
      Logger.error(`token err: ${error}`);
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}
