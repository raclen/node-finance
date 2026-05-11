import express from 'express';
import axios from 'axios';
import moment from 'moment';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static(__dirname));

/**
 * 使用雪球 API 获取纳斯达克综合指数历史数据
 */
async function fetchXueqiuStockData(code, begin, period, count) {
    const url = `https://stock.xueqiu.com/v5/stock/chart/kline.json?symbol=${code}&begin=${begin}&period=${period}&type=before&count=${count}&indicator=kline%2Cpe%2Cpb%2Cps%2Cpcf%2Cmarket_capital%2Cagt%2Cggt%2Cbalance`;

    const response = await axios.get(url, {
        headers: {
            Accept: 'application/json, text/plain, */*',
            Cookie: 'xqat=05ecf720bcc0cb0d0ce319045c7960b18fa571fd;u=9057207726',
        },
    });

    const data = response.data;
    if (!data || !data.data || !data.data.item) {
        throw new Error('雪球数据格式异常');
    }

    return data.data.item.map((row) => {
        return data.data.column.reduce((obj, key, index) => {
            obj[key] = row[index];
            if (key === 'timestamp') {
                obj[key] = moment(row[index]).format('YYYY-MM-DD');
            }
            return obj;
        }, {});
    });
}

/**
 * 分页获取长时间跨度的数据，雪球单次最多返回约 200 条
 */
async function getHistoryData(code, startDate, endDate) {
    const startTs = moment(startDate, 'YYYYMMDD').valueOf();
    const endTs = moment(endDate, 'YYYYMMDD').valueOf();

    let allData = [];
    let currentBegin = endTs;

    while (currentBegin > startTs) {
        const batch = await fetchXueqiuStockData(code, currentBegin, 'day', -200);
        if (!batch || batch.length === 0) break;

        allData = [...batch, ...allData];

        const earliestTs = moment(batch[0].timestamp, 'YYYY-MM-DD').valueOf();
        if (earliestTs <= startTs) break;
        currentBegin = earliestTs;
    }

    return allData.filter((item) => {
        const t = moment(item.timestamp, 'YYYY-MM-DD').valueOf();
        return t >= startTs && t <= endTs;
    });
}

function calculateDrawdown(data) {
    let maxPrice = 0;
    let maxDrawdown = 0;

    const result = data.map((item) => {
        maxPrice = Math.max(maxPrice, item.close);
        const drawdown = ((item.close - maxPrice) / maxPrice) * 100;
        maxDrawdown = Math.min(maxDrawdown, drawdown);
        console.log(item);
        
        return { date: item.timestamp, close: item.close, drawdown, pe: item.pe_ttm ?? item.pe ?? null };
    });

    return { data: result, maxDrawdown };
}

function analyzeStats(code, data) {
    if (!data || data.length < 10) return { code, error: '数据不足' };

    // 统计下跌波段：连续2天以上下跌算一次回调
    let declineCount = 0;
    let inDecline = false;
    let declineDays = 0;
    let totalDeclineDays = 0;
    let maxDeclineDays = 0;

    for (let i = 1; i < data.length; i++) {
        if (data[i].close < data[i - 1].close) {
            if (!inDecline) {
                inDecline = true;
                declineCount++;
                declineDays = 1;
            } else {
                declineDays++;
            }
        } else {
            if (inDecline) {
                totalDeclineDays += declineDays;
                maxDeclineDays = Math.max(maxDeclineDays, declineDays);
                declineDays = 0;
            }
            inDecline = false;
        }
    }

    // 平均每 N 天发生一次下跌
    const totalDays = data.length;
    const avgDaysBetweenDeclines = totalDays / Math.max(declineCount, 1);
    const avgDeclineDays = totalDeclineDays / Math.max(declineCount, 1);

    // 近期PE统计
    const lastPe = data[data.length - 1].pe;
    const peValues = data.filter(d => d.pe != null).map(d => d.pe);
    const avgPe = peValues.length > 0 ? peValues.reduce((a, b) => a + b, 0) / peValues.length : null;
    const minPe = peValues.length > 0 ? Math.min(...peValues) : null;
    const maxPe = peValues.length > 0 ? Math.max(...peValues) : null;

    // 年化波动率（日收益率标准差 * sqrt(252)）
    const returns = [];
    for (let i = 1; i < data.length; i++) {
        returns.push((data[i].close - data[i - 1].close) / data[i - 1].close);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / returns.length;
    const annualVolatility = Math.sqrt(variance * 252) * 100;

    return {
        code,
        totalDays,
        totalDeclineCount: declineCount,
        avgDaysBetweenDeclines: avgDaysBetweenDeclines.toFixed(1),
        avgDeclineDays: avgDeclineDays.toFixed(1),
        maxDeclineDays,
        annualVolatility: annualVolatility.toFixed(2),
        lastPE: lastPe != null ? lastPe.toFixed(2) : null,
        avgPE: avgPe != null ? avgPe.toFixed(2) : null,
        minPE: minPe != null ? minPe.toFixed(2) : null,
        maxPE: maxPe != null ? maxPe.toFixed(2) : null,
    };
}

app.get('/api/drawdown', async (req, res) => {
    try {
        const { start, end, code } = req.query;
        const startDate = start || moment().subtract(1, 'year').format('YYYYMMDD');
        const endDate = end || moment().format('YYYYMMDD');
        let code1 = code || '.IXIC';

        const data = await getHistoryData(code1, startDate, endDate);

        if (!data || data.length === 0) {
            return res.status(404).json({ error: '未获取到数据，请检查日期范围或稍后重试' });
        }

        const drawdownData = calculateDrawdown(data);
        res.json(drawdownData);
    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 多指数对比接口
 * GET /api/drawdown/compare?codes=.IXIC,SPY&start=...&end=...
 */
app.get('/api/drawdown/compare', async (req, res) => {
    try {
        const { start, end, codes } = req.query;
        const startDate = start || moment().subtract(1, 'year').format('YYYYMMDD');
        const endDate = end || moment().format('YYYYMMDD');
        const codeList = (codes || '.IXIC,SPY').split(',').map(s => s.trim()).filter(Boolean);

        const results = await Promise.all(codeList.map(async (code) => {
            const data = await getHistoryData(code, startDate, endDate);
            if (!data || data.length === 0) return { code, error: '未获取到数据' };
            const drawdownData = calculateDrawdown(data);
            const stats = analyzeStats(code, drawdownData.data);
            return { code, data: drawdownData.data, maxDrawdown: drawdownData.maxDrawdown, stats };
        }));

        res.json(results);
    } catch (error) {
        console.error('API错误:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
