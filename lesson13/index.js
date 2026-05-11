
import axios from "axios";
import logger from "../utils/logger.js";
import { sendMail } from "../utils/mailer.js";



// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";

const INTERVAL = "15m"; // 时间间隔
const MONITOR_INTERVAL = 30000; // 每次监控的间隔时间（毫秒）
const RSI_PERIOD = 14; // RSI 计算周期
const MOMENTUM_PERIOD = 10; // 动量策略周期


const axiosInstance = axios.create({
  timeout: 10000, // 设置超时时间为 10 秒
});



// 计算动量指标
function calculateMomentum(klineData, period) {
  if (klineData.length < period + 1) return null;
  const currentClose = parseFloat(klineData[0][4]);
  const pastClose = parseFloat(klineData[period][4]);
  return currentClose - pastClose;
}
// 计算前N个周期的平均收盘价和平均成交量
function calculateAverageCloseAndVolume(klineData, period) {
  if (klineData.length < period) return null;
  let sumClose = 0;
  let sumVolume = 0;
  for (let i = 0; i < period; i++) {
    sumClose += parseFloat(klineData[i][4]);
    sumVolume += parseFloat(klineData[i][5]);
  }
  return {
    averageClose: sumClose / period,
    averageVolume: sumVolume / period,
  };
}
// 动量策略：判断价格是否持续上升
function momentumStrategy(klineData) {
  const AVERAGE_PERIOD = 3;
  const RECENT_PERIOD = 2;
  if (klineData.length < AVERAGE_PERIOD + RECENT_PERIOD) return false;
  const { averageClose, averageVolume } = calculateAverageCloseAndVolume(
    klineData.slice(RECENT_PERIOD),
    AVERAGE_PERIOD
  );
  const currentClose = parseFloat(klineData[0].close);
  const currentVolume = parseFloat(klineData[0].volume);
  const recentClose1 = parseFloat(klineData[1].close);
  const recentVolume1 = parseFloat(klineData[1].volume);
  return (
    currentClose > averageClose &&
    currentClose > recentClose1 &&
    currentVolume > averageVolume &&
    currentVolume > recentVolume1 
  );
}
// 策略3：趋势追踪策略
function trendFollowingStrategy(klineData) {
  const shortTermMA = calculateSMA(klineData, 5); // 短期均线
  const longTermMA = calculateSMA(klineData, 20); // 长期均线

  const currentShortMA = shortTermMA[shortTermMA.length - 1];
  const currentLongMA = longTermMA[longTermMA.length - 1];

  return currentShortMA > currentLongMA; // 短期均线上穿长期均线
}

// 策略4：均值回归策略
function meanReversionStrategy(currentPrice, klineData) {
  const longTermMA = calculateSMA(klineData, 20); // 长期均线
  const currentLongMA = longTermMA[longTermMA.length - 1];

  const deviation = Math.abs(currentPrice - currentLongMA) / currentLongMA;
  return deviation > 0.02 && currentPrice < currentLongMA; // 偏离超过2%并低于均线
}

// 计算简单移动平均线（SMA）
function calculateSMA(klineData, period) {
  const prices = klineData.map(k => parseFloat(k[4])); // 收盘价
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}
// 计算 RSI 指标
function calculateRSI(klineData) {
  if (klineData.length < RSI_PERIOD + 1) return null;

  let gains = 0, losses = 0;
  for (let i = 1; i <= RSI_PERIOD; i++) {
    const change = parseFloat(klineData[i - 1][4]) - parseFloat(klineData[i][4]);
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }

  const avgGain = gains / RSI_PERIOD;
  const avgLoss = losses / RSI_PERIOD;
  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}
// 获取K线数据
async function getKlines(stockcode) {
  const url = `${API_BASE}/market/candles?instId=${stockcode}&bar=${INTERVAL}`;
  const response = await axiosInstance.get(url);
  return response.data.data; // 返回K线数据
}


// 主监控逻辑
async function monitor(stockcode) {
  logger.info(`开始监控${stockcode}价格和成交量...`);

  try {
    const klineData = await getKlines(stockcode);

    if (klineData.length < 20) {
      logger.info('K线数据不足');
      return;
    }
    const rsi = calculateRSI(klineData);
    const currentKline = klineData[0];
    const currentPrice = parseFloat(currentKline[4]);

    const strategy1Satisfied = trendFollowingStrategy(klineData);
    const strategy2Satisfied = meanReversionStrategy(currentPrice, klineData);
    const strategy3Satisfied = rsi !== null && rsi < 30;
    const momentumSatisfied = momentumStrategy(klineData);

    console.log(`当前动量: ${calculateMomentum(klineData, MOMENTUM_PERIOD)}`);
    console.log(`当前 RSI: ${rsi}`);

 
    if(strategy1Satisfied){
      logger.info('策略1：趋势追踪策略满足');
    }else {
      logger.info('策略1：趋势追踪策略不满足');
    }
    if(strategy2Satisfied){
      logger.info('策略2：均值回归策略满足');
    }else {
      logger.info('策略2：均值回归策略不满足');
    }
    if(strategy3Satisfied){
      logger.info('策略3：RSI指标满足');
    } else {
      logger.info('策略3：RSI指标不满足');
    }
    if (momentumSatisfied) {
      logger.info('策略4：动量策略满足');
      sendMail('2275025@qq.com', 'OKX提示', '策略4：动量策略满足，开始买入操作');
    } else {
      logger.info('策略4：动量策略不满足');
    }

    if (strategy1Satisfied && strategy2Satisfied && strategy3Satisfied && momentumSatisfied) {
      sendMail('2275025@qq.com', 'OKX提示', '策略1、2、3、4同时满足，开始买入操作');
    } else {
      logger.info('策略未同时满足，继续监控...');
    }
  } catch (error) {
    logger.info("监控过程中出错:" +error.message);
  }

  setTimeout(()=>{
    monitor(stockcode)
  }, MONITOR_INTERVAL);
}

// 启动监控
monitor('BTC-USDT');

// sendMail('2275025@qq.com', '测试邮件', '测试邮件内容');