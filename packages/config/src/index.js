import Command from "@zhihaoo/command";
import { ConfigManager, Logger } from "@zhihaoo/utils";
import { execSync } from "child_process";

class ConfigCommand extends Command {
  get command() {
    return "config [token]";
  }

  get description() {
    return "设置开发者的配置信息";
  }

  async action([token, opts]) {
    if (!token) {
      Logger.error("请输入 token");
      return;
    }

    const { valid, error } = await ConfigManager.validateGithubToken(token);

    if (!valid) throw `token error: ${error}`;

    const username = execSync("git config --global user.name")
      .toString()
      .trim();

    ConfigManager.saveToken(token, username);
  }
}

export default function Config(instance) {
  return new ConfigCommand(instance);
}
