const axios = require("axios");


// 配置 OKX API
const API_BASE = "https://www.okx.com/api/v5";
// 配置 OKX API
const API_KEY = "你的API Key";
const SECRET_KEY = "你的Secret Key";
const PASSPHRASE = "你的Passphrase";
const SYMBOL = "ETH-USDT"; // ETH/USDT 交易对
const INTERVAL = "15m"; // 时间间隔
const MONITOR_INTERVAL = 10000; // 每次监控的间隔时间（毫秒）

// 策略2：自定义短线买入策略
function shortTermBuyStrategy(currentPrice, previousPrice) {
  // 示例策略：当前价格比前一个K线的收盘价高出1%以内
  const priceDifference = currentPrice - previousPrice;
  const percentageDifference = (priceDifference / previousPrice) * 100;
  return percentageDifference > 0 && percentageDifference <= 1;
}
// https://www.okx.com/priapi/v5/market/candles?instId=TRX-USDT
// 获取K线数据
async function getKlines() {
  const url = `${API_BASE}/market/candles?instId=${SYMBOL}&bar=${INTERVAL}`;
  const response = await axios.get(url);
  console.log(response.data);
  
  return response.data.data; // 返回K线数据
}

// 执行买入操作
const crypto = require("crypto");
const axios = require("axios");



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

  // 请求体：买入 ETH/USDT 市价单
  const body = JSON.stringify({
    instId: "ETH-USDT", // 交易对
    tdMode: "cash",     // 保证金模式，"cash" 表示非杠杆账户
    side: "buy",        // 买入
    ordType: "market",  // 市价单
    sz: "0.01",         // 买入数量（ETH）
  });

  // 生成签名
  const signature = generateSignature(timestamp, "POST", requestPath, body);

  try {
    // 发起 POST 请求
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

    if (klineData.length < 2) {
      console.error("K线数据不足");
      return;
    }

    const currentKline = klineData[0]; // 当前15分钟K线
    const previousKline = klineData[1]; // 上一15分钟K线

    const currentVolume = parseFloat(currentKline[5]); // 当前成交量
    const previousVolume = parseFloat(previousKline[5]); // 上一成交量

    const currentPrice = parseFloat(currentKline[4]); // 当前收盘价
    const previousPrice = parseFloat(previousKline[4]); // 上一收盘价

    // 判断策略1
    const strategy1Satisfied = currentVolume > previousVolume && currentPrice > previousPrice;

    // 判断策略2
    const strategy2Satisfied = shortTermBuyStrategy(currentPrice, previousPrice);

    if (strategy1Satisfied && strategy2Satisfied) {
      await executeBuyOperation();
    } else {
      console.log("策略未满足，继续监控...");
    }
  } catch (error) {
    console.error("监控过程中出错:", error.message);
  }

  // 设置定时器继续监控
  setTimeout(monitor, MONITOR_INTERVAL);
}

// 启动监控
monitor();
