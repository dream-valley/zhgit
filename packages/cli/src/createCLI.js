import path from "node:path";
import fse from "fs-extra";
import semver from "semver";
import { dirname } from "dirname-filename-esm";
import { program } from "commander";

const __dirname = dirname(import.meta);
const pkgPath = path.resolve(__dirname, "../package.json");
const pkg = fse.readJsonSync(pkgPath);

const LOWEST_NODE_VERSION = "16.20.2";

export default function createCLI() {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .option("-d, --debug", "是否启动调试模式")
    .hook("preAction", preAction);

  program.on("option:debug", () => {
    console.log(program.opts());
    if (program.opts().debug) {
      // log.verbose("debug", "debug 模式已启动");

      console.log("debug 模式已启动");
    }
  });

  return program;
}

function preAction() {
  // 检测 node 版本
  if (semver.lt(process.version, LOWEST_NODE_VERSION)) {
    throw new Error(
      chalk.red(
        `zhgit 需要安装 ${LOWEST_NODE_VERSION} 以上版本的 Node.js, 当前版本：${process.version}`
      )
    );
  }
}
