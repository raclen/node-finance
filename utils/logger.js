/**
 * 日志记录器
 * 
 * 功能：
 * 1. 记录日志
 * 2. 查询日志
 * 3. 清除日志
 * 4. 错误日志
 * 
 */
// const logger = require('./utils/logger');

// // 记录日志
// logger.info('系统启动');
// logger.warn('磁盘空间不足');
// logger.error('数据库连接失败');

// // 查询日志
// const errorLogs = logger.query({ level: 'error' });
// const recentLogs = logger.query({ 
//   startTime: '2024-01-01T00:00:00Z',
//   endTime: '2024-01-02T00:00:00Z' 
// });


class Logger {
  constructor() {
    this.logs = [];

    setInterval(() => this.cleanOldLogs(), 60 * 60 * 1000);
  }

  // 清理48小时前的日志
  cleanOldLogs() {
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000);
    this.logs = this.logs.filter((log) => new Date(log.timestamp) > cutoffTime);
  }

  // 记录日志
  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
    };
    this.logs.push(logEntry);
    console.log(`[${level.toUpperCase()}] ${timestamp}: ${message}`);
    // 如果日志数量超过一定限制，触发清理
    if (this.logs.length > 10000) {
      this.cleanOldLogs();
    }
  }

  // 记录错误日志
  error(message) {
    this.log(message, "error");
  }

  // 记录警告日志
  warn(message) {
    this.log(message, "warn");
  }

  // 记录信息日志
  info(message) {
    this.log(message, "info");
  }

  // 查询日志
  query(options = {}) {
    let filteredLogs = [...this.logs];

    // 按级别筛选
    if (options.level) {
      filteredLogs = filteredLogs.filter((log) => log.level === options.level);
    }

    // 按时间范围筛选
    if (options.startTime) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) >= new Date(options.startTime)
      );
    }

    if (options.endTime) {
      filteredLogs = filteredLogs.filter(
        (log) => new Date(log.timestamp) <= new Date(options.endTime)
      );
    }

    return filteredLogs;
  }

  // 清除日志
  clear() {
    this.logs = [];
  }
}

// 导出单例实例
const logger = new Logger();

export default logger;
