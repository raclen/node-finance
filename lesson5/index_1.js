const axios = require('axios');

async function getSinaStockData(symbol) {
  // symbol 为股票代码，上海市场加前缀“sh”，深证市场加前缀“sz”
  const url = `https://hq.sinajs.cn/list=${symbol}`;
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  // 新浪返回的是 GBK 编码，需要将数据解码
  const gbkDecoder = new TextDecoder('gbk');
  const decodedData = gbkDecoder.decode(response.data);

  // 返回示例类似于：var hq_str_sh600519="贵州茅台,1923.000,....";
  // 下面简单切割解析股票名称、当前价等信息
  const dataString = decodedData.split('=')[1].replace(/"/g, '');
  const dataArr = dataString.split(',');

  // dataArr[0] = '贵州茅台', dataArr[3] = 今日最新价
  const stockName = dataArr[0];
  const currentPrice = dataArr[3];
  return { stockName, currentPrice };
}

// 测试
(async () => {
  try {
    const result = await getSinaStockData('sh600519');
    console.log(result); // { stockName: '贵州茅台', currentPrice: '1923.000' }
  } catch (err) {
    console.error(err);
  }
})();