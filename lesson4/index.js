/**
 * 国内数据查询示例：获取股票指数近十年指定月份的涨跌情况
 */

const axios = require('axios');
const moment = require('moment');

async function getStockIndexData(stockCode,Prefix) {
    try {
        // 构造 secid 参数
        const secid = `${Prefix}.${stockCode}`; // 假设股票代码前缀为 "1."

        const response = await axios.get('http://push2his.eastmoney.com/api/qt/stock/kline/get', {
            params: {
                secid,              // 股票代码
                fields1: 'f1,f2,f3,f4,f5,f6',
                fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
                klt: '101',         // 日K线
                fqt: '1',           // 前复权
                beg: '20241226',    // 开始日期
                end: '20241230',    // 结束日期
                lmt: '1000000',     // 最大条数
                _: Date.now()
            },
            headers: {
                'Referer': 'http://quote.eastmoney.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (!response.data || !response.data.data || !response.data.data.klines) {
            throw new Error('数据格式错误');
        }

        console.log(response.data.data);
        

        const klineData = response.data.data.klines;

        klineData.forEach(line => {
            const [dateStr, open, close, high, low, volume,tradingVolume, amplitude, riseandfall, riseandfallamount, turnoverrate] = line.split(',');
            const date = moment(dateStr).format('YYYY-MM-DD')
            console.log(date, open, close, high, low, volume,tradingVolume, amplitude, riseandfall, riseandfallamount, turnoverrate);
          
        });

    } catch (error) {
        console.error('数据获取失败：', error.message);
        if (error.response) {
            console.error('错误详情：', error.response.data);
        }
    }
}

// 示例调用
getStockIndexData('000001', 1); // 查询上证指数



// fields1: f1,f3 (代码,名称)
// fields2: f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61 (日期,开盘,收盘,最高,最低,成交量,成交额,振幅,涨跌幅,涨跌额,换手率)
// klt: k线类型 (101日线 102周线 103月线 104季线 105半年线 106年线)
// fqt: 复权类型 (0不复权 1前复权 2后复权)
// secid: 股票/行业代码 如股票 0.002594 (0深股 1沪股) 如行业 90.BK0733 (90是固定值)
// end: 20241230 结束日期
// lmt: 1000000 最大条数