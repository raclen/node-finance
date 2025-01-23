import axios from "axios";
import crypto from "crypto";
import { logColor } from "../utils/index.js";

// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
const API_KEY = "你的API Key";
const SECRET_KEY = "你的Secret Key";
const PASSPHRASE = "你的Passphrase";
const SYMBOL = "OKB-USDT";
const INTERVAL = "15m";
const MONITOR_INTERVAL = 30000;
const RSI_PERIOD = 14;
const MOMENTUM_PERIOD = 10;
const SMA_SHORT = 5;
const SMA_LONG = 20;
const STOP_LOSS_THRESHOLD = 0.05;
const TARGET_PROFIT_THRESHOLD = 0.1;

const axiosInstance = axios.create({ timeout: 10000 });

// 计算 RSI 指标
function calculateRSI(klineData, period) {
  if (klineData.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const change = parseFloat(klineData[i - 1][4]) - parseFloat(klineData[i][4]);
    if (change > 0) gains += change;
    else losses -= change;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// 计算简单移动平均线（SMA）
function calculateSMA(klineData, period) {
  const prices = klineData.map(k => parseFloat(k[4]));
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// 计算动量指标
function calculateMomentum(klineData, period) {
  if (klineData.length < period + 1) return null;
  const currentClose = parseFloat(klineData[0][4]);
  const pastClose = parseFloat(klineData[period][4]);
  return currentClose - pastClose;
}

// 计算布林带上轨
function calculateBollingerBands(klineData, period = 20) {
  if (klineData.length < period) return null;
  const sma = calculateSMA(klineData, period).pop();
  const prices = klineData.slice(0, period).map(k => parseFloat(k[4]));
  const stdDev = Math.sqrt(prices.reduce((acc, p) => acc + Math.pow(p - sma, 2), 0) / period);
  return { upper: sma + 2 * stdDev, lower: sma - 2 * stdDev };
}

// 各种策略的实现
function rsiStrategy(klineData) {
  const rsi = calculateRSI(klineData, RSI_PERIOD);
  return rsi !== null && rsi > 70;
}

function smaCrossStrategy(klineData) {
  const shortSMA = calculateSMA(klineData, SMA_SHORT).pop();
  const longSMA = calculateSMA(klineData, SMA_LONG).pop();
  return shortSMA < longSMA;
}

function momentumStrategy(klineData) {
  const momentum = calculateMomentum(klineData, MOMENTUM_PERIOD);
  return momentum !== null && momentum < 0;
}

function bollingerBreakoutStrategy(klineData) {
  const bands = calculateBollingerBands(klineData);
  if (!bands) return false;
  const currentPrice = parseFloat(klineData[0][4]);
  return currentPrice > bands.upper;
}

function stopLossStrategy(entryPrice, currentPrice) {
  return currentPrice <= entryPrice * (1 - STOP_LOSS_THRESHOLD);
}

function targetProfitStrategy(entryPrice, currentPrice) {
  return currentPrice >= entryPrice * (1 + TARGET_PROFIT_THRESHOLD);
}

// 获取K线数据
async function getKlines(stockCode) {
  const url = `${API_BASE}/market/candles?instId=${stockCode}&bar=${INTERVAL}`;
  const response = await axiosInstance.get(url);
  return response.data.data;
}

// 监控逻辑
async function monitor(stockCode) {
  logColor(`开始监控${stockCode}价格...`, 'underline');
  try {
    const klineData = await getKlines(stockCode);
    if (klineData.length < 20) {
      logColor('K线数据不足', 'red');
      return;
    }
    const currentPrice = parseFloat(klineData[0][4]);
    const entryPrice = parseFloat(klineData[1][4]);
    
    if (rsiStrategy(klineData)) logColor('RSI 策略满足，建议卖出', 'green');
    if (smaCrossStrategy(klineData)) logColor('均线死叉策略满足，建议卖出', 'green');
    if (momentumStrategy(klineData)) logColor('动量策略满足，建议卖出', 'green');
    if (bollingerBreakoutStrategy(klineData)) logColor('布林带突破策略满足，建议卖出', 'green');
    if (stopLossStrategy(entryPrice, currentPrice)) logColor('止损策略触发，建议卖出', 'red');
    if (targetProfitStrategy(entryPrice, currentPrice)) logColor('达到目标利润，建议卖出', 'blue');
  } catch (error) {
    logColor("监控过程中出错: " + error.message, 'red');
  }
  setTimeout(()=>{
    monitor(stockCode)
  }, MONITOR_INTERVAL);
}

// 启动监控
monitor("OKB-USDT");
