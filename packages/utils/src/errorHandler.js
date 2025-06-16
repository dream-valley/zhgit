import { Logger } from "./index.js";

/**
 * 企业级错误处理类
 */
export class ZhgitError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ZhgitError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

/**
 * 错误代码常量
 */
export const ERROR_CODES = {
  // Git 相关错误
  GIT_NOT_REPOSITORY: 'GIT_NOT_REPOSITORY',
  GIT_DIRTY_WORKING_DIR: 'GIT_DIRTY_WORKING_DIR',
  GIT_BRANCH_EXISTS: 'GIT_BRANCH_EXISTS',
  GIT_BRANCH_NOT_EXISTS: 'GIT_BRANCH_NOT_EXISTS',
  GIT_MERGE_CONFLICT: 'GIT_MERGE_CONFLICT',
  GIT_PUSH_FAILED: 'GIT_PUSH_FAILED',
  GIT_FETCH_FAILED: 'GIT_FETCH_FAILED',
  
  // 网络相关错误
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_CONNECTION_FAILED: 'NETWORK_CONNECTION_FAILED',
  API_RATE_LIMIT: 'API_RATE_LIMIT',
  
  // 认证相关错误
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_MISSING: 'AUTH_TOKEN_MISSING',
  AUTH_PERMISSION_DENIED: 'AUTH_PERMISSION_DENIED',
  
  // 配置相关错误
  CONFIG_INVALID: 'CONFIG_INVALID',
  CONFIG_MISSING: 'CONFIG_MISSING',
  
  // 输入验证错误
  INVALID_BRANCH_NAME: 'INVALID_BRANCH_NAME',
  INVALID_INPUT: 'INVALID_INPUT',
  
  // 系统错误
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * 错误处理器类
 */
export class ErrorHandler {
  /**
   * 处理错误并提供用户友好的消息
   * @param {Error} error - 原始错误
   * @param {string} context - 错误上下文
   * @returns {ZhgitError} 处理后的错误
   */
  static handle(error, context = '') {
    if (error instanceof ZhgitError) {
      return error;
    }

    let zhgitError;
    const errorMessage = error.message || error.toString();

    // Git 相关错误处理
    if (errorMessage.includes('not a git repository')) {
      zhgitError = new ZhgitError(
        '当前目录不是 Git 仓库，请在 Git 仓库中执行此命令',
        ERROR_CODES.GIT_NOT_REPOSITORY,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('Your branch is ahead') || errorMessage.includes('Changes not staged')) {
      zhgitError = new ZhgitError(
        '工作区有未提交的更改，请先提交或暂存更改',
        ERROR_CODES.GIT_DIRTY_WORKING_DIR,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('already exists')) {
      zhgitError = new ZhgitError(
        '分支已存在，请使用不同的分支名',
        ERROR_CODES.GIT_BRANCH_EXISTS,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('CONFLICT')) {
      zhgitError = new ZhgitError(
        '合并时发生冲突，请手动解决冲突后继续',
        ERROR_CODES.GIT_MERGE_CONFLICT,
        { originalError: errorMessage, context }
      );
    } 
    // 网络相关错误处理
    else if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
      zhgitError = new ZhgitError(
        '网络请求超时，请检查网络连接后重试',
        ERROR_CODES.NETWORK_TIMEOUT,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
      zhgitError = new ZhgitError(
        '网络连接失败，请检查网络设置',
        ERROR_CODES.NETWORK_CONNECTION_FAILED,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('rate limit')) {
      zhgitError = new ZhgitError(
        'API 请求频率超限，请稍后重试',
        ERROR_CODES.API_RATE_LIMIT,
        { originalError: errorMessage, context }
      );
    }
    // 认证相关错误处理
    else if (errorMessage.includes('Bad credentials') || errorMessage.includes('401')) {
      zhgitError = new ZhgitError(
        'GitHub Token 无效，请使用 zhgit config 重新设置',
        ERROR_CODES.AUTH_TOKEN_INVALID,
        { originalError: errorMessage, context }
      );
    } else if (errorMessage.includes('403')) {
      zhgitError = new ZhgitError(
        '权限不足，请检查 Token 权限或仓库访问权限',
        ERROR_CODES.AUTH_PERMISSION_DENIED,
        { originalError: errorMessage, context }
      );
    }
    // 默认错误处理
    else {
      zhgitError = new ZhgitError(
        `操作失败: ${errorMessage}`,
        ERROR_CODES.UNKNOWN_ERROR,
        { originalError: errorMessage, context }
      );
    }

    return zhgitError;
  }

  /**
   * 记录错误到日志
   * @param {ZhgitError} error - 错误对象
   */
  static logError(error) {
    Logger.error(`[${error.code}] ${error.message}`);
    if (error.details.context) {
      Logger.error(`上下文: ${error.details.context}`);
    }
    if (process.env.DEBUG) {
      console.error('详细错误信息:', error.toJSON());
    }
  }

  /**
   * 显示用户友好的错误消息
   * @param {ZhgitError} error - 错误对象
   */
  static displayError(error) {
    Logger.error(error.message);
    
    // 根据错误类型提供解决建议
    switch (error.code) {
      case ERROR_CODES.GIT_NOT_REPOSITORY:
        Logger.info('💡 建议: 请在 Git 仓库根目录中执行命令');
        break;
      case ERROR_CODES.GIT_DIRTY_WORKING_DIR:
        Logger.info('💡 建议: 执行 git add . && git commit -m "your message" 提交更改');
        break;
      case ERROR_CODES.AUTH_TOKEN_INVALID:
        Logger.info('💡 建议: 执行 zhgit config <your-github-token> 重新设置 Token');
        break;
      case ERROR_CODES.NETWORK_TIMEOUT:
        Logger.info('💡 建议: 检查网络连接，或稍后重试');
        break;
      case ERROR_CODES.GIT_MERGE_CONFLICT:
        Logger.info('💡 建议: 手动解决冲突后执行:');
        Logger.info('   1. git add .');
        Logger.info('   2. git commit -m "resolve conflicts"');
        Logger.info('   3. 重新执行 zhgit 命令');
        break;
    }
  }
}

/**
 * 重试机制装饰器
 * @param {number} maxRetries - 最大重试次数
 * @param {number} delay - 重试延迟（毫秒）
 * @param {Function} shouldRetry - 判断是否应该重试的函数
 */
export function withRetry(maxRetries = 3, delay = 1000, shouldRetry = null) {
  return function(target, propertyName, descriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function(...args) {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await method.apply(this, args);
        } catch (error) {
          lastError = error;
          
          // 检查是否应该重试
          if (shouldRetry && !shouldRetry(error)) {
            throw error;
          }
          
          if (attempt === maxRetries) {
            throw error;
          }
          
          Logger.warn(`操作失败，${delay}ms 后进行第 ${attempt + 1} 次重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
    
    return descriptor;
  };
}

/**
 * 网络请求重试判断函数
 * @param {Error} error - 错误对象
 * @returns {boolean} 是否应该重试
 */
export function shouldRetryNetworkError(error) {
  const errorMessage = error.message || error.toString();
  
  // 这些错误应该重试
  const retryableErrors = [
    'timeout',
    'ETIMEDOUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ECONNRESET',
    'socket hang up',
    'rate limit'
  ];
  
  return retryableErrors.some(pattern => 
    errorMessage.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * 异步操作包装器，提供统一的错误处理
 * @param {Function} operation - 要执行的异步操作
 * @param {string} context - 操作上下文
 * @returns {Promise} 包装后的 Promise
 */
export async function safeExecute(operation, context = '') {
  try {
    return await operation();
  } catch (error) {
    const zhgitError = ErrorHandler.handle(error, context);
    ErrorHandler.logError(zhgitError);
    throw zhgitError;
  }
}
