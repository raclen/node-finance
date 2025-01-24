import axios from "axios";
import crypto from "crypto";
import moment from "moment";
import { logColor } from "../utils/index.js";

// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
const API_KEY = "你的API Key";
const SECRET_KEY = "你的Secret Key";
const PASSPHRASE = "你的Passphrase";

const SYMBOL = "OKB-USDT"; // 交易对
// const INTERVAL = "15m"; // 时间间隔
const MONITOR_INTERVAL = 30000; // 每次监控的间隔时间（毫秒）
const RSI_PERIOD = 14; // RSI 计算周期
const axiosInstance = axios.create({ timeout: 10000 }); // 设置超时时间为 10 秒

//----------------------------------------------------------------
// 1. 工具函数部分
//----------------------------------------------------------------

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

// 动量策略示例（从原代码保留）
function momentumStrategy(klineData) {
  const AVERAGE_PERIOD = 14;
  const RECENT_PERIOD = 2;
  if (klineData.length < AVERAGE_PERIOD + RECENT_PERIOD) return false;
  const { averageClose, averageVolume } = calculateAverageCloseAndVolume(
    klineData.slice(RECENT_PERIOD),
    AVERAGE_PERIOD
  );
  const currentClose = parseFloat(klineData[0][4]);
  const currentVolume = parseFloat(klineData[0][5]);
  const recentClose1 = parseFloat(klineData[1][4]);
  const recentClose2 = parseFloat(klineData[2][4]);
  const recentVolume1 = parseFloat(klineData[1][5]);
  const recentVolume2 = parseFloat(klineData[2][5]);
  return (
    currentClose > averageClose &&
    currentClose > recentClose1 &&
    currentClose > recentClose2 &&
    currentVolume > averageVolume &&
    currentVolume > recentVolume1 &&
    currentVolume > recentVolume2
  );
}

// 计算简单移动平均线（SMA）
function calculateSMA(klineData, period) {
  const prices = klineData.map((k) => parseFloat(k[4])); // 收盘价
  const sma = [];
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// 均线金叉/死叉策略
// 短期均线 > 长期均线 => 金叉（买入）
// 短期均线 < 长期均线 => 死叉（卖出）
function trendFollowingStrategy(klineData) {
  const shortTermMA = calculateSMA(klineData, 5);  // 短期均线
  const longTermMA = calculateSMA(klineData, 20); // 长期均线
  const currentShortMA = shortTermMA[shortTermMA.length - 1];
  const currentLongMA = longTermMA[longTermMA.length - 1];
  return currentShortMA > currentLongMA; // 买入：短期均线上穿长期均线
}

// 均线死叉策略，用于卖出
function maDeadCrossStrategy(klineData) {
  const shortTermMA = calculateSMA(klineData, 5);
  const longTermMA = calculateSMA(klineData, 20);
  if (!shortTermMA.length || !longTermMA.length) return false;
  const currentShortMA = shortTermMA[shortTermMA.length - 1];
  const currentLongMA = longTermMA[longTermMA.length - 1];
  return currentShortMA < currentLongMA; // 卖出：短期均线下穿长期均线 => 死叉
}

// 计算 RSI 指标
function calculateRSI(klineData, period = RSI_PERIOD) {
  if (klineData.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const change =
      parseFloat(klineData[i - 1][4]) - parseFloat(klineData[i][4]);
    if (change > 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// RSI 卖出策略：如果 RSI > 70 视为超买，触发卖出
function rsiSellStrategy(klineData) {
  const rsi = calculateRSI(klineData);
  if (rsi === null) return false;
  return rsi > 70;
}

// 布林带计算
function calculateBollingerBands(klineData, period = 20, multiplier = 2) {
  if (klineData.length < period) return null;
  const prices = klineData.map((k) => parseFloat(k[4]));
  // 计算中轨
  const smaValues = calculateSMA(klineData, period); // 中轨
  const middleBand = smaValues[smaValues.length - 1];
  // 计算标准差
  const recentPrices = prices.slice(prices.length - period);
  const mean =
    recentPrices.reduce((acc, val) => acc + val, 0) / recentPrices.length;
  const variance =
    recentPrices.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
    recentPrices.length;
  const stdDev = Math.sqrt(variance);
  // 上下轨
  const upperBand = middleBand + multiplier * stdDev;
  const lowerBand = middleBand - multiplier * stdDev;
  return { middleBand, upperBand, lowerBand };
}

// 布林带卖出策略：如果价格突破上轨，视为超买，触发卖出
function bollingerSellStrategy(klineData) {
  const bands = calculateBollingerBands(klineData);
  if (!bands) return false;
  const { upperBand } = bands;
  const currentPrice = parseFloat(klineData[0][4]);
  return currentPrice > upperBand;
}

// 均值回归策略 (从原代码保留)
function meanReversionStrategy(currentPrice, klineData) {
  const longTermMA = calculateSMA(klineData, 20); // 长期均线
  const currentLongMA = longTermMA[longTermMA.length - 1];
  const deviation = Math.abs(currentPrice - currentLongMA) / currentLongMA;
  return deviation > 0.02 && currentPrice < currentLongMA; // 偏离超过2%并低于均线
}

//----------------------------------------------------------------
// 2. OKX下单相关函数
//----------------------------------------------------------------

// 获取K线数据
async function getKlines(stockcode,bar = '15m', limit = 100) {
  const url = `${API_BASE}/market/candles?instId=${stockcode}&bar=${bar}&limit=${limit}`;
  const response = await axiosInstance.get(url);
   // 根据日期倒序的数据，这里将时间戳转换成可读格式
   let klineData = response.data.data;
   klineData.forEach((item) => {
    item[0] = moment(Number(item[0])).format("YYYY-MM-DD HH:mm:ss");
  });
  // 开始日期
  console.log('开始日期:',klineData[klineData.length-1][0]);
// 结束日期
  console.log('结束日期:',klineData[0][0]);
  return klineData; // 返回K线数据
}

// 获取时间戳（UTC 时间）
function getTimestamp() {
  return new Date().toISOString();
}

// 生成签名
function generateSignature(timestamp, method, requestPath, body = "") {
  const message = timestamp + method + requestPath + body;
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(message)
    .digest("base64");
}

// 执行买入操作
async function executeBuyOperation() {
  const requestPath = "/trade/order";
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();
  const body = JSON.stringify({
    instId: SYMBOL,
    tdMode: "cash",
    side: "buy",
    ordType: "market",
    sz: "0.01", // 示例尺寸
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

// 执行卖出操作
async function executeSellOperation() {
  const requestPath = "/trade/order";
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();
  const body = JSON.stringify({
    instId: SYMBOL,
    tdMode: "cash",
    side: "sell", 
    ordType: "market",
    sz: "0.01", // 示例尺寸
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
    console.log("卖出成功:", response.data);
  } catch (error) {
    console.error("卖出失败:", error.response ? error.response.data : error.message);
  }
}

//----------------------------------------------------------------
// 3. 监控逻辑（添加卖出策略判断）
//----------------------------------------------------------------
async function monitor(stockcode) {
  logColor(`开始监控 ${stockcode} 价格和成交量...`, "underline");

  try {
    const klineData = await getKlines(stockcode);
   

    if (klineData.length < 20) {
      logColor("K线数据不足", "red");
      return;
    }

    const rsi = calculateRSI(klineData, RSI_PERIOD);
    const currentKline = klineData[0];
    const currentPrice = parseFloat(currentKline[4]);

    // 买入策略示例
    const strategyTrend = trendFollowingStrategy(klineData);
    const strategyMean = meanReversionStrategy(currentPrice, klineData);
    const strategyRSI = rsi !== null && rsi < 30; // RSI < 30 视为买入
    const strategyMomentum = momentumStrategy(klineData);

    // 卖出策略示例
    const strategyDeadCross = maDeadCrossStrategy(klineData);
    const strategyRsiSell = rsiSellStrategy(klineData);
    const strategyBollingerSell = bollingerSellStrategy(klineData);

    console.log(`当前 RSI: ${rsi || "N/A"}`);

    // 展示买入策略判断
    if (strategyTrend) {
      logColor("买入策略：趋势追踪满足", "green");
    } else {
      logColor("买入策略：趋势追踪不满足", "red");
    }
    if (strategyMean) {
      logColor("买入策略：均值回归满足", "green");
    } else {
      logColor("买入策略：均值回归不满足", "red");
    }
    if (strategyRSI) {
      logColor("买入策略：RSI 指标满足 (RSI < 30)", "green");
    } else {
      logColor("买入策略：RSI 指标不满足", "red");
    }
    if (strategyMomentum) {
      logColor("买入策略：动量策略满足", "green");
    } else {
      logColor("买入策略：动量策略不满足", "red");
    }

    // 如果需要同时满足全部条件再买入：
    if (strategyTrend && strategyMean && strategyRSI && strategyMomentum) {
      await executeBuyOperation();
    } else {
      logColor("买入策略未同时满足，继续监控...", "blue");
    }

    // 卖出策略判断
    if (strategyDeadCross) {
      logColor("卖出策略：均线死叉满足", "yellow");
    } else {
      logColor("卖出策略：均线死叉不满足", "red");
    }
    if (strategyRsiSell) {
      logColor("卖出策略：RSI 超买 (RSI > 70)", "yellow");
    } else {
      logColor("卖出策略：RSI 未超买", "red");
    }
    if (strategyBollingerSell) {
      logColor("卖出策略：布林带突破上轨 (超买)", "yellow");
    } else {
      logColor("卖出策略：未突破上轨", "red");
    }

    // 如果需要同时满足全部条件再卖出：
    if (strategyDeadCross && strategyRsiSell && strategyBollingerSell) {
      await executeSellOperation();
    } else {
      logColor("卖出策略未同时满足，继续监控...", "blue");
    }
  } catch (error) {
    logColor("监控过程中出错: " + error.message, "red");
  }

  // 递归定时调用
  setTimeout(() => {
    monitor(stockcode);
  }, MONITOR_INTERVAL);
}

//----------------------------------------------------------------
// 4. 回测逻辑示例
//----------------------------------------------------------------

/*
  简易回测思路：
  - 假设有一段历史 K 线数据 klineDataHistory（从老到新排序）
  - 遍历每个时间点，计算买入或卖出策略
  - 当触发买入信号且当前没有持仓时，假设以收盘价买入
  - 当触发卖出信号且当前有持仓时，假设以收盘价卖出
  - 最终统计盈亏
*/

function backtest(klineDataHistory) {
  let position = 0;       // 0 表示空仓，1 表示持有
  let entryPrice = 0;     // 建仓价格
  let profit = 0;         // 累计收益
  const trades = [];      // 记录交易详情

  for (let i = 20; i < klineDataHistory.length; i++) {
    // 取出过去到 i 的切片
    const sliceData = klineDataHistory.slice(i - 20, i + 1).reverse();
    const currentPrice = parseFloat(sliceData[0][4]);
    const strategyTrend = true || trendFollowingStrategy(sliceData);
    const strategyMean = true|| meanReversionStrategy(currentPrice, sliceData);
    const currentRSI = calculateRSI(sliceData);
    const strategyRSI = currentRSI !== null && currentRSI < 30;
    const strategyMomentum = momentumStrategy(sliceData);

    const strategyDeadCross = maDeadCrossStrategy(sliceData);
    const strategyRsiSell = rsiSellStrategy(sliceData);
    const strategyBollSell = bollingerSellStrategy(sliceData);

    const latestPrice = parseFloat(sliceData[0][4]); // Current close
    const percChange = ((latestPrice - entryPrice) / entryPrice) * 100; // Profit or loss %

    if(sliceData[0][0].match(/2024-05-(1[89]|2[01])/)){
      // console.log(sliceData[0][0]+':',percChange.toFixed(2)+'%');
    }
    
    const percsell = percChange >= 2; // Sell if profit >= 5%

    // 买入策略示例：全部满足
    // const buySignal = strategyTrend || strategyMean || strategyRSI || strategyMomentum;
    const buySignal = strategyTrend || strategyMomentum;
    // 卖出策略示例：全部满足
    // const sellSignal = strategyDeadCross || strategyRsiSell || strategyBollSell || percsell;
    const sellSignal = percsell;




    if (buySignal && position === 0) {
      position = 1;
      entryPrice = currentPrice;
      trades.push({ type: "BUY", price: currentPrice, index: i ,date:sliceData[0][0]});
    } else if (sellSignal && position === 1) {
      position = 0;
      const gain = (currentPrice - entryPrice)/entryPrice * 100;
      profit += gain;
      trades.push({ type: "SELL", price: currentPrice, index: i, gain,date:sliceData[0][0] });
    }
  }
  let profitb = profit.toFixed(2)+'%';

  return { finalProfit: profitb, trades };
}

//----------------------------------------------------------------
// 5. 启动监控 + 回测演示
//----------------------------------------------------------------

// 这里仅演示实时监控，如需回测可手动获取历史 K 线数据进行 backtest
// monitor(SYMBOL);

// 如果要手动调用回测，需事先获取一段历史数据：
// (示例) 
const klineDataHistory = await getKlines("DOGE-USDT",'1D',1000); // 请自行获取更长周期数据
const result = backtest(klineDataHistory.reverse()); // 注意需要从老到新排序

// 根据gain大于0的交易记录，计算胜率
const winTrades = result.trades.filter(t => t.gain > 0 && t.type === "SELL");
const winRate = winTrades.length /result.trades.filter(t => t.type === "SELL").length;

// console.log("回测结果:", result);
// 交易记录
console.table(result.trades);
// finalProfit
console.log("回测结果:", result.finalProfit);

// 交易次数
console.log('交易次数:',result.trades.length/2);
logColor("胜率:"+winRate* 100+'%', "green");