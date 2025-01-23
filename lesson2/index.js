/**
 * 使用 Yahoo Finance API 获取股票数据
 * https://github.com/gadicc/node-yahoo-finance2/blob/devel/docs/modules/historical.md
 */

import yahooFinance from "yahoo-finance2";
/**
 * 获取指定股票在特定月份的历史表现
 * @param {string} symbol - 股票代码（如：'^NDX'、'000906.SS'）
 * @param {number} month - 月份（1-12）
 * @param {number} years - 需要获取的年数（默认10年）
 * @returns {Promise<Object>} 分析结果
 */
async function getStockMonthlyPerformance(symbol, month, years = 10) {
  try {
    // 验证输入参数
    if (month < 1 || month > 12) {
      throw new Error('月份必须在1-12之间');
    }

    // 转换沪深股票代码格式（如果需要）
    const formattedSymbol = symbol; ;
    
    // 计算日期范围
    const endDate = new Date();
    const startDate = new Date();
    // 多获取1年数据以确保完整性
    startDate.setFullYear(endDate.getFullYear() - (years + 1));

    console.log(`正在获取 ${formattedSymbol} 近${years}年${month}月份的数据...`);
    
    const historical = await yahooFinance.historical(formattedSymbol, {
      period1: startDate.toISOString().split('T')[0],
      period2: endDate.toISOString().split('T')[0],
      interval: '1d'
    });
    // console.log('数据获取成功:', historical);
    

    // 过滤指定月份的数据
    const monthlyPerformance = historical.reduce((acc, curr) => {
      const date = new Date(curr.date);
      const year = date.getFullYear();
      const currMonth = date.getMonth() + 1; // 转换为1-12的月份

      if (currMonth === month) {
        if (!acc[year]) {
          acc[year] = {
            firstDay: curr,
            lastDay: curr,
            dailyData: [curr]
          };
        } else {
          acc[year].lastDay = curr;
          acc[year].dailyData.push(curr);
        }
      }
      return acc;
    }, {});

    // 计算每年指定月份的涨跌幅
    const results = Object.entries(monthlyPerformance)
      .map(([year, data]) => {
        const startPrice = data.firstDay.close;
        const startVolume = data.firstDay.volume/10000;
        console.log('xd-data', data);
        
        const endPrice = data.lastDay.close;
        const endVolume = data.lastDay.volume/10000;
        const change = endPrice - startPrice;
        const changePercent = (change / startPrice) * 100;
        
        // 计算最高和最低价
        const highestPrice = Math.max(...data.dailyData.map(d => d.high));
        const lowestPrice = Math.min(...data.dailyData.map(d => d.low));
        const tradingDays = data.dailyData.length;

        return {
          年份: parseInt(year),
          起始日期: formatDate(data.firstDay.date),
          结束日期: formatDate(data.lastDay.date),
          起始交易量: startVolume+ '万',
          结束交易量: endVolume+ '万',
          开盘价: startPrice.toFixed(4),
          收盘价: endPrice.toFixed(4),
          最高价: highestPrice.toFixed(2),
          最低价: lowestPrice.toFixed(2),
          // 涨跌额: change.toFixed(2),
          涨跌幅: changePercent.toFixed(2) + '%',
          交易天数: tradingDays
        };
      })
      .sort((a, b) => b.年份 - a.年份)
      .slice(0, years);

    // 计算统计信息
    const stats = calculateStats(results);

    return {
      stockInfo: {
        代码: symbol,
        月份: month,
        年数: years
      },
      yearlyPerformance: results,
      statistics: stats
    };

  } catch (error) {
    console.error('数据获取失败:', error);
    return null;
  }
}


/**
 * 格式化日期
 */
function formatDate(date) {
  return new Date(date).toISOString().split('T')[0];
}


/**
 * 计算统计信息
 */
function calculateStats(results) {
  const percentages = results.map(r => parseFloat(r.涨跌幅));
  const changes = results.map(r => parseFloat(r.涨跌额));
  
  return {
    平均涨跌幅: (percentages.reduce((a, b) => a + b, 0) / percentages.length).toFixed(2) + '%',
    // 平均涨跌额: (changes.reduce((a, b) => a + b, 0) / changes.length).toFixed(2),
    上涨年份: percentages.filter(p => p > 0).length,
    下跌年份: percentages.filter(p => p < 0).length,
    最大涨幅: Math.max(...percentages).toFixed(2) + '%',
    最大跌幅: Math.min(...percentages).toFixed(2) + '%',
    平均交易天数: Math.round(results.reduce((sum, r) => sum + r.交易天数, 0) / results.length),
  };
}

/**
 * 格式化输出结果
 */
function printResults(data) {
  if (!data) return;

  const { stockInfo, yearlyPerformance, statistics } = data;
  
  console.log(`\n${stockInfo.代码} - 近${stockInfo.年数}年${stockInfo.月份}月份表现\n`);
  
  // 打印年度数据
  console.log('年度表现:');
  console.table(yearlyPerformance);
  
  // 打印统计数据
  console.log('\n统计信息:');
  console.table(statistics);
}

// 使用示例
async function main() {
  // 可以传入不同的股票代码和月份
  // 例如：'^NDX'（纳斯达克100）、'000906.SS'（中证800）
  const examples = [
    // { symbol: '^GSPC', month: 1, years: 10 },  // 标普500 1月表现
    // { symbol: '^NDX', month: 1 },    // 纳斯达克100 11月表现
    // { symbol: '000905.SS', month: 12 }    // 中证500 -- 000906.SZ
    // { symbol: '000906.SS', month: 12 }    // 中证800 -- 000906.SZ
    // { symbol: '600519.SS', month: 12 }    // 茅台 -- 600519.SS
    // { symbol: '159525.SZ', month: 12 }    // 中证红利 -- 159525.SZ
    // { symbol: '000300.SS', month: 12 }    // 沪深300 -- 159525.SZ
    // { symbol: '000001.SS', month: 2 }    // 上证指数 -- 000001.SS
    { symbol: '^IXIC', month: 1 }    // 纳斯达克综合指数 -- IXIC
  ];

  for (const example of examples) {
    const data = await getStockMonthlyPerformance(example.symbol, example.month);
    printResults(data);
  }
}

main();

// 获取中证800（000906）1月份表现
// getStockMonthlyPerformance('000906', 1);

// 获取纳斯达克100 12月份表现
// getStockMonthlyPerformance('NDX', 12);

// 指定年数（如获取近5年数据）
// getStockMonthlyPerformance('000906', 1, 5);

// 纳斯达克100 (^NDX)
// 标普500 (^GSPC)
// 道琼斯工业平均指数 (^DJI)
// 纳斯达克综合指数 (^IXIC)