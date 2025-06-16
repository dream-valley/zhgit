# Zhgit 工作流演示

本文档演示了使用 Zhgit 进行日常开发的完整工作流程。

## 场景一：新功能开发

### 1. 初始设置

```bash
# 首次使用，配置 GitHub Token
zhgit config ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 验证配置
zhgit config --verify
```

### 2. 创建功能分支

```bash
# 方式一：指定分支名
zhgit branch create feature-user-profile

# 方式二：自动生成分支名
zhgit branch create
# 输出: 已创建分支 john-feature-1216-1430

# 方式三：基于特定分支
zhgit branch create feature-api-v2 --base dev
```

### 3. 开发代码

```bash
# 正常的 Git 操作
git add src/components/UserProfile.vue
git commit -m "feat: add user profile component"

git add src/api/user.js  
git commit -m "feat: add user API endpoints"

git add tests/user.test.js
git commit -m "test: add user profile tests"
```

### 4. 推送并创建 PR

```bash
# 推送到 main 分支
zhgit push main

# Zhgit 会自动：
# 1. 创建合并分支
# 2. 拉取远程最新代码
# 3. 合并目标分支
# 4. 推送到远程
# 5. 创建结构化 PR
# 6. 切换回原分支
```

## 场景二：紧急修复

### 1. 快速创建修复分支

```bash
# 基于 main 分支创建紧急修复分支
zhgit branch create hotfix-login-bug --base main
```

### 2. 修复问题

```bash
git add src/auth/login.js
git commit -m "fix: resolve login timeout issue"
```

### 3. 快速发布

```bash
# 推送到 release 分支进行发布
zhgit push release
```

## 场景三：多分支管理

### 1. 查看分支状态

```bash
# 查看本地分支
zhgit branch list

# 查看所有分支（包含远程）
zhgit branch list --remote
```

### 2. 分支切换

```bash
# 切换到现有分支
zhgit branch switch feature-dashboard

# 切换到远程分支（自动创建本地分支）
zhgit branch switch feature-new-ui

# 强制基于远程分支重新创建本地分支
zhgit branch switch feature-dashboard --force
# 这会删除本地的 feature-dashboard 分支，然后基于远程最新代码重新创建
```

### 3. 清理分支

```bash
# 删除已合并的分支
zhgit branch delete feature-completed

# 强制删除分支
zhgit branch delete feature-abandoned --force
```

## 场景四：团队协作

### 1. 同步远程更改

```bash
# 创建分支时自动基于最新远程代码
zhgit branch create feature-collaboration

# 推送时自动合并最新目标分支代码
zhgit push dev
```

### 2. 处理合并冲突

```bash
# 如果推送时遇到冲突，Zhgit 会提供详细指导：

# 🔧 合并冲突解决指南:
# 1. 手动解决冲突文件中的冲突标记
# 2. git add .
# 3. git commit -m "resolve conflicts"
# 4. zhgit push dev (重新执行推送)
```

## 场景五：强制同步远程分支

### 1. 本地分支过时的情况

```bash
# 场景：同事更新了远程的 feature-api 分支，但你的本地分支是旧版本

# 普通切换（会切换到本地旧版本）
zhgit branch switch feature-api
# 输出: ✅ 已切换到分支: feature-api
# 输出: 💡 提示: 如需基于远程分支重新创建，请使用 --force 选项

# 强制基于远程最新代码重新创建
zhgit branch switch feature-api --force
# 输出: ⚠️  本地分支 feature-api 已存在，将被删除并基于远程重新创建
# 输出: 📍 先切换到 main 分支...
# 输出: 🗑️ 删除本地分支 feature-api...
# 输出: 🔄 基于远程分支重新创建: feature-api
# 输出: ✅ 已基于远程分支切换到: feature-api
```

### 2. 解决本地修改冲突

```bash
# 如果本地有未提交的修改，会提示先处理
zhgit branch switch feature-api --force
# 输出: ✗ 工作区有未提交的更改，请先提交或暂存更改

# 处理方式1：提交本地修改
git add .
git commit -m "save local changes"
zhgit branch switch feature-api --force

# 处理方式2：暂存本地修改
git stash
zhgit branch switch feature-api --force
git stash pop  # 如需要恢复修改
```

## 场景六：错误处理和恢复

### 1. 网络问题自动重试

```bash
# Zhgit 会自动重试网络操作
zhgit push main
# 如果网络超时，会自动重试 3 次
```

### 2. 权限问题诊断

```bash
# Token 权限不足时的提示
zhgit push main
# ✗ 权限不足，请检查 Token 权限或仓库访问权限
# 💡 建议: 执行 zhgit config <your-github-token> 重新设置 Token
```

### 3. 工作区状态检查

```bash
# 工作区不干净时的提示
zhgit push main
# ✗ 工作区有未提交的更改，请先提交或暂存更改
# 💡 建议: 执行 git add . && git commit -m "your message" 提交更改
```

## 最佳实践

### 1. 分支命名规范

```bash
# 功能分支
zhgit branch create feature-user-authentication
zhgit branch create feature-payment-integration

# 修复分支  
zhgit branch create fix-memory-leak
zhgit branch create hotfix-security-vulnerability

# 重构分支
zhgit branch create refactor-api-structure
```

### 2. 提交信息规范

```bash
# 使用 Conventional Commits 格式
git commit -m "feat: add user registration"
git commit -m "fix: resolve login validation issue"  
git commit -m "docs: update API documentation"
git commit -m "test: add integration tests"
git commit -m "refactor: improve code structure"
```

### 3. 工作流程建议

```bash
# 1. 每个功能使用独立分支
zhgit branch create feature-specific-name

# 2. 定期同步主分支
zhgit branch create feature-sync --base main

# 3. 及时清理已合并分支
zhgit branch delete feature-completed

# 4. 使用描述性的分支名和提交信息
```

## 故障排除

### 常见问题

1. **Token 验证失败**

   ```bash
   zhgit config <new-token>
   ```

2. **分支已存在**

   ```bash
   zhgit branch create new-name
   # 或强制覆盖
   zhgit branch create existing-name --force
   ```

3. **网络连接问题**

   ```bash
   # Zhgit 会自动重试，如果持续失败请检查网络连接
   ```

4. **合并冲突**

   ```bash
   # 按照 Zhgit 提供的指导手动解决冲突
   git add .
   git commit -m "resolve conflicts"
   zhgit push <target-branch>
   ```

### 调试模式

```bash
# 启用详细日志
DEBUG=1 zhgit push main

# 查看详细错误信息
zhgit push main --debug
```
