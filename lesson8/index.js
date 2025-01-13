const axios = require('axios');

const OKX_API_URL = 'https://www.okx.com';
const SYMBOL = 'ETH-USDT'; // 交易对
const CHECK_INTERVAL = 60000; // 检查间隔，毫秒（例如：60秒）

// 获取ETH的分时价格和成交量
async function getEthMarketData() {
    try {
        const response = await axios.get(`${OKX_API_URL}/api/v5/market/candles`, {
            params: {
                instId: SYMBOL,
                bar: '15m', // 15分钟的K线数据
                limit: 2 // 获取最近两个15分钟的K线数据
            }
        });

        return response.data.data;
    } catch (error) {
        console.error('获取市场数据时发生错误：', error);
        return null;
    }
}

// 进行自动买入
async function placeBuyOrder(price, amount) {
    try {
        const response = await axios.post(`${OKX_API_URL}/api/v5/trade/order`, {
            instId: SYMBOL,
            tdMode: 'cash', // 交易模式
            side: 'buy',
            ordType: 'limit',
            px: price.toString(),
            sz: amount.toString()
        }, {
            headers: {
                'OK-ACCESS-KEY': 'your_api_key',
                'OK-ACCESS-SIGN': 'your_signature',
                'OK-ACCESS-TIMESTAMP': new Date().toISOString(),
                'OK-ACCESS-PASSPHRASE': 'your_passphrase'
            }
        });

        console.log('买入订单已提交：', response.data);
    } catch (error) {
        console.error('提交买入订单时发生错误：', error);
    }
}

// 持续监控并执行买入操作
async function monitorAndTrade() {
    const amount = 0.1; // 购买的ETH数量（示例）

    while (true) {
        const marketData = await getEthMarketData();
        if (marketData && marketData.length >= 2) {
            const [previousCandle, currentCandle] = marketData;

            const prevVolume = parseFloat(previousCandle[5]);
            const currVolume = parseFloat(currentCandle[5]);
            const prevClose = parseFloat(previousCandle[4]);
            const currClose = parseFloat(currentCandle[4]);

            console.log(`上一个15分钟成交量：${prevVolume}，当前15分钟成交量：${currVolume}`);
            console.log(`上一个15分钟收盘价：${prevClose}，当前15分钟收盘价：${currClose}`);

            if (currVolume > prevVolume && currClose > prevClose) {
                console.log('成交量和价格均高于上一个15分钟周期，执行买入操作');
                await placeBuyOrder(currClose, amount);
                break; // 成功买入后退出循环
            } else {
                console.log('未达到买入条件，继续监控');
            }
        }

        // 等待一段时间后再检查
        await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
    }
}

// 开始监控
monitorAndTrade();
