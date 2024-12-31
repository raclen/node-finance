/**
 * 获取实时数据
 */

const axios = require('axios');

const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'sec-ch-ua-platform': '"Windows"',
    'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'Sec-Fetch-Site': 'cross-site',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Dest': 'script',
    'Referer': 'https://finance.sina.com.cn/realstock/company/sh000001/nc.shtml',
    'Accept-Language': 'zh-CN,zh;q=0.9,ja;q=0.8,en;q=0.7,am;q=0.6',
};

// console.log('headers', headers);

const config = {
  method: 'GET',
  responseType: 'arraybuffer',
  url: 'https://hq.sinajs.cn?list=sh000001',
  headers: headers
};

axios.request(config)
  .then(response => {
    const gbkDecoder = new TextDecoder('gbk');
    const decodedData = gbkDecoder.decode(response.data);
    console.log('decodedData'+decodedData);
  })
  .catch(error => console.log('error', error));



