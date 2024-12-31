/**
 * 获取新浪股票历史数据
 */

const axios = require('axios');

async function fetchSinaStockData(symbol, scale, datalen, ma = 'no') {
  const baseUrl = 'https://quotes.sina.cn/cn/api/jsonp_v2.php';
  const apiPath = '/CN_MarketDataService.getKLineData';

  // 构建完整的 URL
  const url = `${baseUrl}var%20_${symbol}_${scale}_${+new Date()}=${apiPath}`;
  
  const params = {
    symbol, // 股票代码
    scale,   // 数据周期，240 代表日线数据
    ma,     // 是否返回均线数据
    datalen,  // 数据长度，最大值为1970
  };

  try {
    // 发起 GET 请求
    const response = await axios.get(url, {
      params,
      responseType: 'text', // 保持原始 JSONP 文本格式
    });

    // 提取 JSONP 数据并解析为 JSON 格式
    const jsonpData = response.data;

    // console.log('jsonpData', jsonpData);
    

    const jsonString = jsonpData.match(/=\((.*?)\)/)[1]; // 提取 JSON 数据
    const jsonData = JSON.parse(jsonString); // 转换为 JSON 对象

    return jsonData;
  } catch (error) {
    console.error('获取新浪股票数据时发生错误:', error.message);
    throw error;
  }
}

// 测试调用函数
(async () => {
  try {
    const result = await fetchSinaStockData('sh000001', 240, 5);
    console.table(result);
  } catch (error) {
    console.error('错误:', error.message);
  }
})();
