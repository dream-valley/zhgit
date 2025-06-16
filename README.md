# Zhgit - 企业级 Git 工作流 CLI 工具

[![npm version](https://badge.fury.io/js/zhgit.svg)](https://badge.fury.io/js/zhgit)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Zhgit 是一个专为团队协作设计的企业级 Git CLI 工具，旨在标准化和简化 Git 工作流程。

## ✨ 核心特性

### 🚀 智能推送 (zhgit push)

- **自动分支管理**: 创建合并分支，避免污染主分支
- **智能 PR 生成**: 区分历史提交和本次提交，生成结构化 PR 描述
- **冲突智能处理**: 提供详细的冲突解决指导
- **网络重试机制**: 自动处理网络异常和超时

### 🌿 智能分支管理 (zhgit branch)

- **基于远程最新代码**: 自动基于远程 main 分支创建新分支
- **智能命名**: 自动生成符合规范的分支名
- **安全操作**: 分支冲突检测和安全删除
- **多种操作**: 创建、切换、删除、列表

### 🔐 企业级安全

- **Token 加密存储**: 使用系统密钥库安全存储 GitHub Token
- **命令注入防护**: 防止恶意命令执行
- **权限验证**: 自动检查仓库操作权限
- **审计日志**: 记录所有操作用于审计

### 🛡️ 稳定性保障

- **边界情况处理**: 完善的错误处理和恢复机制
- **Git 状态检查**: 自动检查工作区状态和仓库有效性
- **用户友好提示**: 详细的错误信息和解决建议

## 📦 安装

```bash
npm install -g zhgit
# 或
pnpm add -g zhgit
```

## 🚀 快速开始

### 1. 配置 GitHub Token

```bash
zhgit config <your-github-token>
```

### 2. 创建新分支

```bash
# 基于远程最新 main 分支创建新分支
zhgit branch create feature-login

# 自动生成分支名
zhgit branch create
```

### 3. 推送代码并创建 PR

```bash
# 推送到目标分支并自动创建 PR
zhgit push main
zhgit push dev
zhgit push release
```

## 📖 详细用法

### Branch 命令

```bash
# 创建新分支（基于远程最新 main）
zhgit branch create <branch-name>
zhgit branch c <branch-name>

# 切换分支
zhgit branch switch <branch-name>
zhgit branch s <branch-name>

# 强制基于远程分支重新创建本地分支
zhgit branch switch <branch-name> --force

# 删除分支
zhgit branch delete <branch-name>
zhgit branch d <branch-name> -f  # 强制删除

# 列出分支
zhgit branch list
zhgit branch l -r  # 包含远程分支

# 选项
-b, --base <branch>  # 指定基础分支（默认: main）
-f, --force          # 强制操作
-r, --remote         # 包含远程分支
```

### Push 命令

```bash
# 推送到指定分支
zhgit push <target-branch>

# 支持的目标分支
zhgit push main      # 推送到 main 分支
zhgit push dev       # 推送到 dev 分支  
zhgit push release   # 推送到 release 分支
```

### Config 命令

```bash
# 设置 GitHub Token
zhgit config <github-token>
```

## 🎯 工作流程

### 典型的功能开发流程

```bash
# 1. 创建新功能分支
zhgit branch create feature-user-auth

# 2. 开发代码...
git add .
git commit -m "feat: add user authentication"

# 3. 推送并创建 PR
zhgit push main
```

### PR 内容示例

Zhgit 会自动生成结构化的 PR 描述：

```markdown
# 合并请求: username-push-feature-user-auth-to-main-20231216143022 → main

## 📋 变更摘要
共 3 个提交（本次 2 个，历史 1 个）

## 📈 本次提交 (Current Changes)
- **feat: add user authentication**
  - 作者: John Doe
  - 时间: 2023-12-16
  - 提交: `a1b2c3d`

- **fix: handle edge case in login**
  - 作者: John Doe  
  - 时间: 2023-12-16
  - 提交: `e4f5g6h`

## 📚 历史提交 (Previous Changes)
- **refactor: improve code structure**
  - 作者: John Doe
  - 时间: 2023-12-15
  - 提交: `i7j8k9l`

## 📊 提交类型统计
- feat: 1 个
- fix: 1 个
- refactor: 1 个

## ✅ 检查清单
- [ ] 代码已通过本地测试
- [ ] 提交信息符合规范
- [ ] 无破坏性变更
- [ ] 文档已更新（如需要）

---
*此 PR 由 zhgit 自动生成*
```

## 🔧 企业级特性

### 安全性

- ✅ Token 加密存储（系统密钥库）
- ✅ 命令注入防护
- ✅ 输入验证和清理
- ✅ 权限检查和验证

### 稳定性

- ✅ 网络请求重试机制
- ✅ 完善的错误处理
- ✅ Git 状态检查
- ✅ 边界情况处理

### 可维护性

- ✅ 结构化日志记录
- ✅ 详细的错误诊断
- ✅ 用户友好的提示信息
- ✅ 模块化架构设计

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

感谢所有贡献者和使用者的支持！
