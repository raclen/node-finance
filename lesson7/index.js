/**
 * 使用雪球 API 获取股票历史数据
 * @see https://xueqiu.com/S/SH000001
 */

const axios = require("axios");
const moment = require("moment");

/**
 * 获取雪球股票数据
 * @param {string} symbol - 股票代码
 * @param {number} begin - 开始时间的时间戳（毫秒）
 * @param {string} period - 时间周期，例如 "day"、"week"
 * @param {number} count - 获取的记录数，负数表示向前获取
 * @returns {Promise<object>} 返回 API 响应数据
 */
async function fetchXueqiuStockData(symbol, begin, period, count) {
  const url = `https://stock.xueqiu.com/v5/stock/chart/kline.json?symbol=${symbol}&begin=${begin}&period=${period}&type=before&count=${count}&indicator=kline%2Cpe%2Cpb%2Cps%2Cpcf%2Cmarket_capital%2Cagt%2Cggt%2Cbalance`;
  
  // 当前时间2024年1月4号。cookie经过本人尝试xqat和u是必须的，否则拿不到数据。
  // 建议请求头加上全部，才能更像真人请求，后期雪球反爬虫会加强，可会变化。
  // 代码中的请求头的cookie，我写的假的，建议自己抓包获取。
  try {
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json, text/plain, */*",
        // "Accept-Encoding": "gzip, deflate, br, zstd",
        // "sec-ch-ua-platform": '"Windows"',
        // "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        // "sec-ch-ua-mobile": "?0",
        // origin: "https://xueqiu.com",
        // "sec-fetch-site": "same-site",
        // "sec-fetch-mode": "cors",
        // "sec-fetch-dest": "empty",
        // referer: "https://xueqiu.com/S/SH000001",
        // "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        // priority: "u=1, i",
        Cookie: 'xqat=511bf5034992327eaaacb9d6ff05888641f2c88a9;u=5717328043098179;',
      }
    });

    return response.data;
  } catch (error) {
    console.error("获取雪球股票数据时发生错误:", error.message);
    throw error;
  }
}

/**
 * 程序入口函数
 */
async function main() {
  try {
    const date = "2025-01-04";
    const timestamp = moment(date, "YYYY-MM-DD").valueOf(); // 转换为时间戳
    const result = await fetchXueqiuStockData("SH000001", timestamp, "day", -3);

    const data = result.data;
    console.log("原始数据:", data);

    // 将 column 和 item 映射为对象数组
    const mappedData = data.item.map((row) => {
      return data.column.reduce((obj, key, index) => {
        obj[key] = row[index];
        if (key === "timestamp") {
          obj[key] = moment(row[index]).format("YYYY-MM-DD"); // 格式化时间戳
        }
        return obj;
      }, {});
    });

    console.log("映射后的数据:", mappedData);
  } catch (error) {
    console.error("程序运行时发生错误:", error.message);
  }
}

main();

// 运行结果
// 映射后的数据: [
//     {
//       timestamp: '2024-12-31',
//       volume: 50273106200,
//       open: 3406.97,
//       high: 3413.45,
//       low: 3351.76,
//       close: 3351.76,
//       chg: -55.57,
//       percent: -1.63,
//       turnoverrate: 1.11,
//       amount: 562584237431.1,
//       volume_post: null,
//       amount_post: null,
//       pe: null,
//       pb: null,
//       ps: null,
//       pcf: null,
//       market_capital: null,
//       balance: null,
//       hold_volume_cn: null,
//       hold_ratio_cn: null,
//       net_volume_cn: null,
//       hold_volume_hk: null,
//       hold_ratio_hk: null,
//       net_volume_hk: null
//     }]