const axios = require("axios");
const crypto = require("crypto");

// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
const API_KEY = "你的API Key";
const SECRET_KEY = "你的Secret Key";
const PASSPHRASE = "你的Passphrase";
const SYMBOL = "ETH-USDT"; // ETH/USDT 交易对
const INTERVAL = "1H"; // 时间间隔
const MONITOR_INTERVAL = 10000; // 每次监控的间隔时间（毫秒）



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
  console.log("开始监控ETH价格和成交量...");

  try {
    const klineData = await getKlines();

    if (klineData.length < 20) {
      console.error("K线数据不足");
      return;
    }

    const currentKline = klineData[0];
    const currentPrice = parseFloat(currentKline[4]);

    const strategy1Satisfied = trendFollowingStrategy(klineData);
    const strategy2Satisfied = meanReversionStrategy(currentPrice, klineData);

    if (strategy1Satisfied && strategy2Satisfied) {
      await executeBuyOperation();
    } else {
      console.log("策略未满足，继续监控...");
    }
  } catch (error) {
    console.error("监控过程中出错:", error.message);
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
