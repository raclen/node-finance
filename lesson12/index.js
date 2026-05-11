// tslint:true
import axios from "axios";
import crypto from "crypto";
import moment from "moment";
import { logColor } from "../utils/index.js";

// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
const API_KEY = "06b08c41-baad-4ae3-9030-b3e3c7272ef7";
const SECRET_KEY = "55BC271A5410A1D44E2D5A0444C43FF59";
const PASSPHRASE = "Xd22750259@";

const SYMBOL = "ETH-USDT"; // 交易对
const INTERVAL = "15m"; // 时间间隔
const MONITOR_INTERVAL = 30000; // 每次监控的间隔时间（毫秒）
const RSI_PERIOD = 14; // RSI 计算周期
const axiosInstance = axios.create({ timeout: 10000 }); // 设置超时时间为 10 秒
const after = moment('2025-01-24', "YYYY-MM-DD").valueOf(); // 结束日期
const before = moment('2024-01-23', "YYYY-MM-DD").valueOf(); //  开始日期

let entryPrice = 0;     // 建仓价格
const prevPeriods = 3;  // 前N个周期

const shortPeriod = 5; // 5日均线
const longPeriod = 10; // 10日均线

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

// 计算简单移动平均线（SMA）
function calculateSMA(data, period){
  for (let i = 0 ,sum = 0,sum1=[]; i < data.length; i++) {
    for(let j=i; j>=period;j--){
      sum1.push(data[j].close);
      if(j==i-period){
        sum1=[]
        break;
      }
  }
  console.log('sum1:',sum1);


  
  sum = sum1.reduce((a, b) => a + b, 0);
  data[i]['五日均线'] = sum / period;
  }

  console.log('data:',data);
  
  return data;
 
}

// 策略3：趋势追踪策略
function trendFollowingStrategy(klineData) {

  
  const shortTermMA = calculateSMA(klineData, 5); // 5日均线
  const longTermMA = calculateSMA(klineData, 10); // 10日均线

  const lastIndex = klineData.length - 1; // 获取最后一根K线索引
  const currentShortMA = shortTermMA[lastIndex];
  const currentLongMA = longTermMA[lastIndex];

  // 打印2025-01-24日12点到13点的均线
  const timeStr = klineData[0].time; // K线时间字符串
  if (timeStr.startsWith("2025-01-24 12") || timeStr.startsWith("2025-01-24 13")) {
    console.log(timeStr);
    // console.log('klineData:',klineData[0]);
  } 

  return currentShortMA > currentLongMA; // 短期均线上穿长期均线
}


//----------------------------------------------------------------
// 2. OKX下单相关函数
//----------------------------------------------------------------

// 获取K线数据
async function getKlines(stockcode,bar = '15m' ) {
  const url = `${API_BASE}/market/candles?instId=${stockcode}&bar=${bar}`;
  // after 和 before 参数用于限制返回的数据范围
  const response = await axiosInstance.get(url,
    {
      params: {
        // after,
        // before,
        limit: 100, // 限制返回的数据条数
      }
    }
  );
   // 根据日期倒序的数据，这里将时间戳转换成可读格式
   let klineData = response.data.data;

  const formattedData = klineData.map((item) => ({
    time: moment(Number(item[0])).format("YYYY-MM-DD HH:mm:ss"), // 时间戳
    open: parseFloat(item[1]),
    high: parseFloat(item[2]),
    low: parseFloat(item[3]),
    close: parseFloat(item[4]),
    volume: parseFloat(item[5]),
    amount: parseFloat(item[6])
  }));
  const closes = formattedData.map((item) => item.close);
  const volumes = formattedData.map((item) => item.volume);

  // 计算前3个周期的平均价格和成交量
  for (let i = 0; i < formattedData.length; i++) {
    if (i >= prevPeriods) {
      const avgPrice = closes.slice(i - prevPeriods, i).reduce((a, b) => a + b, 0) / prevPeriods;
      const avgVolume = volumes.slice(i - prevPeriods, i).reduce((a, b) => a + b, 0) / prevPeriods;
      formattedData[i]['前3个周期平均价格'] = avgPrice;
      formattedData[i]['前3个周期平均成交量'] = avgVolume;
    }
  }
  // 计算5日均线和10日均线
   calculateSMA(formattedData, shortPeriod);
  // const longTermMA = calculateSMA(closes, longPeriod);

  // 添加均线数据到格式化后的数据中
  // for (let i = 0; i < formattedData.length; i++) {
  //   formattedData[i]['5日均线'] = shortTermMA[i];
  //   formattedData[i]['10日均线'] = longTermMA[i];
  // }

  return 


  // 开始日期
  console.log('开始日期:',formattedData[klineData.length-1].time);
// 结束日期
  console.log('结束日期:',formattedData[0].time);
  return formattedData;
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
  const availableUSDT = await getBalance(SYMBOL.split("-")[1]);
  if (!availableUSDT) {
    console.log("没有可用的 USDT 或查询余额失败。");
    return;
  }
  const requestPath = "/trade/order";
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();
  const body = JSON.stringify({
    instId: SYMBOL,
    tdMode: "cash",
    side: "buy",
    ordType: "market",
    sz: availableBTC.toString(), // 全部买入
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

   // 先查 BTC 的可用余额
   const availableBTC = await getBalance(SYMBOL.split("-")[0]);
   if (!availableBTC) {
     console.log("没有可卖出的 BTC 或查询余额失败。");
     return;
   }
  const requestPath = "/trade/order";
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();
  const body = JSON.stringify({
    instId: SYMBOL,
    tdMode: "cash",
    side: "sell", 
    ordType: "market",
    sz: availableBTC.toString(), // 全部卖出
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

    const currentKline = klineData[0];
    const currentPrice = parseFloat(currentKline[4]);

    // 买入策略示例
    const strategyMomentum = momentumStrategy(klineData);
    const strategyTrend = trendFollowingStrategy(klineData);
    const percChange = ((currentPrice - entryPrice) / entryPrice) * 100; // Profit or loss %
    const percsell = percChange >= 0.5; // Sell if profit >= 5%

    if (strategyMomentum) {
      logColor("买入策略：动量策略满足", "green");
    } else {
      logColor("买入策略：动量策略不满足", "red");
    }
    // strategyTrend && strategyMean && strategyRSI || strategyMomentum
    // 如果需要同时满足全部条件再买入：
    if ( strategyTrend) {
      await executeBuyOperation();
    } else {
      logColor("买入策略未同时满足，继续监控...", "blue");
    }

    // 卖出策略判断

    // 如果需要同时满足全部条件再卖出：
    if (percsell) {
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

// =================================================================

// 生成时间戳（UTC 时间）
function getTimestamp() {
  return new Date().toISOString();
}


// 1. 查询当前余额
async function getBalance(ccy = "BTC") {
  const requestPath = `/account/balance?ccy=${ccy}`; 
  const url = `${API_BASE}${requestPath}`;
  const timestamp = getTimestamp();

  const signature = generateSignature(timestamp, "GET", requestPath);

  try {
    const response = await axios.get(url, {
      headers: {
        "OK-ACCESS-KEY": API_KEY,
        "OK-ACCESS-SIGN": signature,
        "OK-ACCESS-TIMESTAMP": timestamp,
        "OK-ACCESS-PASSPHRASE": PASSPHRASE,
      },
    });
    const data = response.data.data[0];
    // data.details 是数组，找出 ccy 对应的可用数量 availBal
    const details = data.details.find(item => item.ccy === ccy);
    if (details) {
      return parseFloat(details.availBal); // 可用余额
    }
    return 0;
  } catch (error) {
    console.error("查询余额失败:", error.response ? error.response.data : error.message);
    return 0;
  }
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
  // let entryPrice = 0;     // 建仓价格
  let profit = 0;         // 累计收益
  const trades = [];      // 记录交易详情

  for (let i = 20; i < klineDataHistory.length; i++) {
    // 取出过去到 i 的切片
    const sliceData = klineDataHistory.slice(i - 20, i + 1).reverse();
    const currentPrice = parseFloat(sliceData[0][4]);
    const strategyMomentum = momentumStrategy(sliceData);
    const strategyTrend = trendFollowingStrategy(sliceData);

    const percChange = ((currentPrice - entryPrice) / entryPrice) * 100; // Profit or loss %

    const percsell = percChange >= 0.5; // Sell if profit >= 5%

    // 买入策略示例：全部满足
    const buySignal =  strategyTrend && strategyMomentum;
    // 卖出策略示例：全部满足
    const sellSignal = percsell;


    if (buySignal && position === 0) {
      position = 1;
      entryPrice = currentPrice;
      trades.push({ type: "BUY", price: currentPrice, index: i ,gain:'--',date:sliceData[0][0]});
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
const klineDataHistory = await getKlines(SYMBOL,INTERVAL); // 请自行获取更长周期数据
const result = backtest(klineDataHistory.reverse()); // 注意需要从老到新排序

// 根据gain大于0的交易记录，计算胜率
const winTrades = result.trades.filter(t => t.gain > 0 && t.type === "SELL");
const sellNum = result.trades.filter(t => t.type === "SELL").length;
const winRate = winTrades.length /sellNum;

// console.log("回测结果:", result);
// 交易记录
console.table(result.trades);
// finalProfit
console.log("回测结果:", result.finalProfit);

// 交易次数
console.log('交易次数:',sellNum);
logColor("胜率:"+winRate* 100+'%', "green");