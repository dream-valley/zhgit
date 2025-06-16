#!/usr/bin/env node

/**
 * Zhgit 基础功能测试脚本
 * 用于验证 CLI 工具的基本功能是否正常工作
 */

const { execSync } = require("child_process");
const { join } = require("path");

const CLI_PATH = join(__dirname, "../packages/cli/dist/index.js");

class TestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async runTest(name, testFn) {
    console.log(`\n🧪 测试: ${name}`);
    try {
      await testFn();
      console.log(`✅ 通过: ${name}`);
      this.passed++;
    } catch (error) {
      console.log(`❌ 失败: ${name}`);
      console.log(`   错误: ${error.message}`);
      this.failed++;
    }
  }

  execCLI(command, expectError = false) {
    try {
      const result = execSync(`node ${CLI_PATH} ${command}`, {
        encoding: "utf8",
        timeout: 10000,
      });
      if (expectError) {
        throw new Error("Expected command to fail but it succeeded");
      }
      return result;
    } catch (error) {
      if (!expectError) {
        throw new Error(`Command failed: ${error.message}`);
      }
      return error.stdout || error.message;
    }
  }

  async runAllTests() {
    console.log("🚀 开始 Zhgit 基础功能测试\n");

    // 测试 1: CLI 帮助信息
    await this.runTest("CLI 帮助信息显示", () => {
      const output = this.execCLI("--help");
      if (!output.includes("zhgit")) {
        throw new Error('Help output does not contain "zhgit"');
      }
      if (!output.includes("push")) {
        throw new Error('Help output does not contain "push" command');
      }
      if (!output.includes("branch")) {
        throw new Error('Help output does not contain "branch" command');
      }
      if (!output.includes("config")) {
        throw new Error('Help output does not contain "config" command');
      }
    });

    // 测试 2: Branch 命令帮助
    await this.runTest("Branch 命令帮助信息", () => {
      const output = this.execCLI("branch --help");
      if (!output.includes("智能分支管理")) {
        throw new Error("Branch help does not contain expected description");
      }
      if (!output.includes("create")) {
        throw new Error('Branch help does not contain "create" action');
      }
      if (!output.includes("switch")) {
        throw new Error('Branch help does not contain "switch" action');
      }
      if (!output.includes("delete")) {
        throw new Error('Branch help does not contain "delete" action');
      }
      if (!output.includes("list")) {
        throw new Error('Branch help does not contain "list" action');
      }
    });

    // 测试 3: Push 命令帮助
    await this.runTest("Push 命令帮助信息", () => {
      const output = this.execCLI("push --help");
      if (!output.includes("推送代码")) {
        throw new Error("Push help does not contain expected description");
      }
    });

    // 测试 4: Config 命令帮助
    await this.runTest("Config 命令帮助信息", () => {
      const output = this.execCLI("config --help");
      if (!output.includes("配置信息")) {
        throw new Error("Config help does not contain expected description");
      }
    });

    // 测试 5: 无效命令处理
    await this.runTest("无效命令错误处理", () => {
      const output = this.execCLI("invalid-command", true);
      // 应该显示帮助信息或错误信息
      if (
        !output.includes("help") &&
        !output.includes("error") &&
        !output.includes("unknown")
      ) {
        throw new Error("Invalid command should show help or error message");
      }
    });

    // 测试 6: Branch 命令参数验证
    await this.runTest("Branch 命令参数验证", () => {
      const output = this.execCLI("branch", true);
      // 应该要求提供 action 参数
      if (!output.includes("action") && !output.includes("required")) {
        throw new Error("Branch command should require action parameter");
      }
    });

    // 测试 7: 版本信息（如果有的话）
    await this.runTest("版本信息检查", () => {
      try {
        const output = this.execCLI("--version");
        console.log(`   版本: ${output.trim()}`);
      } catch (error) {
        // 版本命令可能未实现，这是可以接受的
        console.log("   版本命令未实现（可选功能）");
      }
    });

    // 输出测试结果
    this.printResults();
  }

  printResults() {
    console.log("\n" + "=".repeat(50));
    console.log("📊 测试结果汇总");
    console.log("=".repeat(50));
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);
    console.log(
      `📈 成功率: ${((this.passed / (this.passed + this.failed)) * 100).toFixed(
        1
      )}%`
    );

    if (this.failed === 0) {
      console.log("\n🎉 所有测试通过！Zhgit CLI 基础功能正常。");
    } else {
      console.log("\n⚠️  部分测试失败，请检查上述错误信息。");
    }

    console.log("\n💡 提示:");
    console.log("- 这些是基础功能测试，不涉及实际的 Git 操作");
    console.log("- 要测试完整功能，请在 Git 仓库中手动测试");
    console.log("- 确保已配置有效的 GitHub Token");
  }
}

// 运行测试
const runner = new TestRunner();
runner.runAllTests().catch((error) => {
  console.error("测试运行失败:", error);
  process.exit(1);
});
