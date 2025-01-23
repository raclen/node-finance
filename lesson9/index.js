
import axios from "axios";
import crypto from "crypto";
import { logColor } from "../utils/index.js";

// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
const API_KEY = "你的API Key";
const SECRET_KEY = "你的Secret Key";
const PASSPHRASE = "你的Passphrase";
const SYMBOL = "ETH-USDT"; // ETH/USDT 交易对
const INTERVAL = "1H"; // 时间间隔
const MONITOR_INTERVAL = 10000; // 每次监控的间隔时间（毫秒）
const RSI_PERIOD = 14; // RSI 计算周期

// 调用示例
// logColor('红色文本', 'red');
// logColor('绿色文本', 'green');
// logColor('蓝色文本', 'blue');
// logColor('加粗文本', 'bold');
// logColor('下划线文本', 'underline');


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
async function getKlines() {
  const url = `${API_BASE}/market/candles?instId=${SYMBOL}&bar=${INTERVAL}`;
  const response = await axios.get(url);
  return response.data.data; // 返回K线数据
}

// 获取时间戳（UTC 时间）
function getTimestamp() {
  return new Date().toISOString();
}

// 生成签名
function generateSignature(timestamp, method, requestPath, body = "") {
  const message = timestamp + method + requestPath + body;
  return crypto.createHmac("sha256", SECRET_KEY).update(message).digest("base64");
}

// 执行买入操作
async function executeBuyOperation() {
  const requestPath = "/trade/order";
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();

  const body = JSON.stringify({
    instId: "ETH-USDT",
    tdMode: "cash",
    side: "buy",
    ordType: "market",
    sz: "0.01",
  });

  const signature = generateSignature(timestamp, "POST", requestPath, body);

  try {
    const response = await axios.post(url, body, {
      headers: {
        "Content-Type": "application/json",
        "OK-ACCESS-KEY": API_KEY,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": PASSPHRASE,
      },
    });

    console.log("买入成功:", response.data);
  } catch (error) {
    console.error("买入失败:", error.response ? error.response.data : error.message);
  }
}

// 主监控逻辑
async function monitor() {
  logColor('开始监控ETH价格和成交量...', 'underline');

  try {
    const klineData = await getKlines();

    if (klineData.length < 20) {
      logColor('K线数据不足', 'red');
      return;
    }
    const rsi = calculateRSI(klineData);
    const currentKline = klineData[0];
    const currentPrice = parseFloat(currentKline[4]);

    const strategy1Satisfied = trendFollowingStrategy(klineData);
    const strategy2Satisfied = meanReversionStrategy(currentPrice, klineData);
    

    const strategy3Satisfied = rsi !== null && rsi < 30;

    console.log(`当前 RSI: ${rsi}`);

    if(strategy1Satisfied){
      logColor('策略1：趋势追踪策略满足', 'green');
    }
    if(strategy2Satisfied){
      logColor('策略2：均值回归策略满足', 'green');
    }
    if(strategy3Satisfied){
      logColor('策略3：RSI指标满足', 'green');
    }

    if (strategy1Satisfied && strategy2Satisfied && strategy3Satisfied) {
      await executeBuyOperation();
    } else {
      logColor('策略未同时满足，继续监控...', 'blue');
    }
  } catch (error) {
    logColor("监控过程中出错:", error.message, 'red');
  }

  setTimeout(monitor, MONITOR_INTERVAL);
}

// 启动监控
monitor();


// 1m	1分钟
// 3m	3分钟
// 5m	5分钟
// 15m	15分钟
// 30m	30分钟
// 1H	1小时
// 2H	2小时
// 4H	4小时
// 6H	6小时
// 12H	12小时
// 1D	1天
// 1W	1周
// 1M	1个月
