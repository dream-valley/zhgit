import { GitUtils } from "./gitUtils.js";
import { Logger } from "./index.js";

/**
 * 提交分析工具类
 * 用于分析提交历史，区分不同类型的提交
 */
export class CommitAnalyzer {
  /**
   * 分析分支的提交历史，区分历史提交和本次提交
   * @param {string} sourceBranch - 源分支
   * @param {string} targetBranch - 目标分支
   * @param {string} originalBranch - 原始工作分支
   * @returns {Object} 分析结果
   */
  static async analyzeCommits(sourceBranch, targetBranch, originalBranch) {
    try {
      // 获取所有提交差异
      const allCommits = GitUtils.getCommitsDiff(targetBranch, sourceBranch);
      
      if (allCommits.length === 0) {
        return {
          currentCommits: [],
          previousCommits: [],
          totalCommits: 0,
          summary: '没有新的提交'
        };
      }

      // 尝试找到分支创建的时间点
      const branchPoint = await this.findBranchPoint(sourceBranch, targetBranch, originalBranch);
      
      // 根据分支点分类提交
      const { currentCommits, previousCommits } = this.categorizeCommits(
        allCommits, 
        branchPoint,
        originalBranch
      );

      // 生成提交摘要
      const summary = this.generateCommitSummary(currentCommits, previousCommits);

      return {
        currentCommits,
        previousCommits,
        totalCommits: allCommits.length,
        summary,
        branchPoint
      };
    } catch (error) {
      Logger.error(`提交分析失败: ${error.message}`);
      // 降级处理：如果分析失败，将所有提交归类为当前提交
      const allCommits = GitUtils.getCommitsDiff(targetBranch, sourceBranch);
      return {
        currentCommits: allCommits,
        previousCommits: [],
        totalCommits: allCommits.length,
        summary: `共 ${allCommits.length} 个提交`,
        branchPoint: null
      };
    }
  }

  /**
   * 查找分支创建的时间点
   * @param {string} sourceBranch - 源分支
   * @param {string} targetBranch - 目标分支  
   * @param {string} originalBranch - 原始工作分支
   * @returns {Date|null} 分支创建时间点
   */
  static async findBranchPoint(sourceBranch, targetBranch, originalBranch) {
    try {
      // 方法1: 通过分支命名模式推断
      // 如果源分支包含时间戳，尝试解析
      const timestampMatch = sourceBranch.match(/(\d{14})$/);
      if (timestampMatch) {
        const timestamp = timestampMatch[1];
        // 格式: YYYYMMDDHHmmss
        const year = parseInt(timestamp.substr(0, 4));
        const month = parseInt(timestamp.substr(4, 2)) - 1; // 月份从0开始
        const day = parseInt(timestamp.substr(6, 2));
        const hour = parseInt(timestamp.substr(8, 2));
        const minute = parseInt(timestamp.substr(10, 2));
        const second = parseInt(timestamp.substr(12, 2));
        
        return new Date(year, month, day, hour, minute, second);
      }

      // 方法2: 通过 Git 日志查找合并基点
      try {
        const mergeBase = GitUtils.execGitCommand([
          'merge-base', 
          targetBranch, 
          originalBranch
        ]);
        
        if (mergeBase) {
          const commitDate = GitUtils.execGitCommand([
            'show', 
            '-s', 
            '--format=%ad', 
            '--date=iso',
            mergeBase
          ]);
          return new Date(commitDate);
        }
      } catch (error) {
        // 忽略错误，继续其他方法
      }

      // 方法3: 使用启发式方法
      // 假设最近的提交是本次提交，较早的是历史提交
      return null;
    } catch (error) {
      Logger.warn(`无法确定分支创建时间点: ${error.message}`);
      return null;
    }
  }

  /**
   * 根据分支点分类提交
   * @param {Array} commits - 所有提交
   * @param {Date|null} branchPoint - 分支创建时间点
   * @param {string} originalBranch - 原始分支名
   * @returns {Object} 分类结果
   */
  static categorizeCommits(commits, branchPoint, originalBranch) {
    if (!branchPoint) {
      // 如果无法确定分支点，使用启发式方法
      return this.heuristicCategorization(commits, originalBranch);
    }

    const currentCommits = [];
    const previousCommits = [];

    commits.forEach(commit => {
      if (commit.date > branchPoint) {
        currentCommits.push(commit);
      } else {
        previousCommits.push(commit);
      }
    });

    return { currentCommits, previousCommits };
  }

  /**
   * 启发式提交分类
   * @param {Array} commits - 所有提交
   * @param {string} originalBranch - 原始分支名
   * @returns {Object} 分类结果
   */
  static heuristicCategorization(commits, originalBranch) {
    // 简单策略：最近的几个提交认为是本次提交
    // 可以根据时间间隔、提交者等进一步优化
    
    if (commits.length <= 3) {
      // 如果提交数量较少，全部归为当前提交
      return {
        currentCommits: commits,
        previousCommits: []
      };
    }

    // 按时间排序（最新的在前）
    const sortedCommits = [...commits].sort((a, b) => b.date - a.date);
    
    // 查找时间间隔较大的分割点
    let splitIndex = 1;
    for (let i = 1; i < sortedCommits.length; i++) {
      const timeDiff = sortedCommits[i - 1].date - sortedCommits[i].date;
      // 如果时间间隔超过1小时，认为是分割点
      if (timeDiff > 60 * 60 * 1000) {
        splitIndex = i;
        break;
      }
    }

    return {
      currentCommits: sortedCommits.slice(0, splitIndex),
      previousCommits: sortedCommits.slice(splitIndex)
    };
  }

  /**
   * 生成提交摘要
   * @param {Array} currentCommits - 本次提交
   * @param {Array} previousCommits - 历史提交
   * @returns {string} 摘要文本
   */
  static generateCommitSummary(currentCommits, previousCommits) {
    const total = currentCommits.length + previousCommits.length;
    let summary = `共 ${total} 个提交`;
    
    if (currentCommits.length > 0 && previousCommits.length > 0) {
      summary += `（本次 ${currentCommits.length} 个，历史 ${previousCommits.length} 个）`;
    } else if (currentCommits.length > 0) {
      summary += `（全部为本次提交）`;
    } else if (previousCommits.length > 0) {
      summary += `（全部为历史提交）`;
    }

    return summary;
  }

  /**
   * 分析提交类型分布
   * @param {Array} commits - 提交列表
   * @returns {Object} 类型统计
   */
  static analyzeCommitTypes(commits) {
    const types = {
      feat: 0,
      fix: 0,
      docs: 0,
      style: 0,
      refactor: 0,
      test: 0,
      chore: 0,
      other: 0
    };

    commits.forEach(commit => {
      const message = commit.message.toLowerCase();
      
      if (message.startsWith('feat')) {
        types.feat++;
      } else if (message.startsWith('fix')) {
        types.fix++;
      } else if (message.startsWith('docs')) {
        types.docs++;
      } else if (message.startsWith('style')) {
        types.style++;
      } else if (message.startsWith('refactor')) {
        types.refactor++;
      } else if (message.startsWith('test')) {
        types.test++;
      } else if (message.startsWith('chore')) {
        types.chore++;
      } else {
        types.other++;
      }
    });

    return types;
  }

  /**
   * 格式化提交列表为 Markdown
   * @param {Array} commits - 提交列表
   * @param {string} title - 标题
   * @returns {string} Markdown 格式的提交列表
   */
  static formatCommitsAsMarkdown(commits, title) {
    if (commits.length === 0) {
      return '';
    }

    let markdown = `## ${title}\n\n`;
    
    commits.forEach(commit => {
      const shortHash = commit.hash.substring(0, 7);
      const author = commit.author;
      const date = commit.date.toLocaleDateString('zh-CN');
      
      markdown += `- **${commit.message}**\n`;
      markdown += `  - 作者: ${author}\n`;
      markdown += `  - 时间: ${date}\n`;
      markdown += `  - 提交: \`${shortHash}\`\n\n`;
    });

    return markdown;
  }

  /**
   * 生成完整的 PR 描述
   * @param {Object} analysis - 提交分析结果
   * @param {string} sourceBranch - 源分支
   * @param {string} targetBranch - 目标分支
   * @returns {string} PR 描述
   */
  static generatePRDescription(analysis, sourceBranch, targetBranch) {
    let description = `# 合并请求: ${sourceBranch} → ${targetBranch}\n\n`;
    
    description += `## 📋 变更摘要\n`;
    description += `${analysis.summary}\n\n`;

    // 本次提交
    if (analysis.currentCommits.length > 0) {
      description += this.formatCommitsAsMarkdown(
        analysis.currentCommits, 
        '📈 本次提交 (Current Changes)'
      );
    }

    // 历史提交
    if (analysis.previousCommits.length > 0) {
      description += this.formatCommitsAsMarkdown(
        analysis.previousCommits, 
        '📚 历史提交 (Previous Changes)'
      );
    }

    // 提交类型统计
    const allCommits = [...analysis.currentCommits, ...analysis.previousCommits];
    const typeStats = this.analyzeCommitTypes(allCommits);
    
    description += `## 📊 提交类型统计\n\n`;
    Object.entries(typeStats).forEach(([type, count]) => {
      if (count > 0) {
        description += `- ${type}: ${count} 个\n`;
      }
    });
    description += '\n';

    // 检查清单
    description += `## ✅ 检查清单\n\n`;
    description += `- [ ] 代码已通过本地测试\n`;
    description += `- [ ] 提交信息符合规范\n`;
    description += `- [ ] 无破坏性变更\n`;
    description += `- [ ] 文档已更新（如需要）\n\n`;

    description += `---\n`;
    description += `*此 PR 由 zhgit 自动生成*`;

    return description;
  }
}
