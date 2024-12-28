const yahooFinance = require('yahoo-finance2').default;
const ExcelJS = require('exceljs');
const moment = require('moment');



async function fetchData(ticker, startDate, endDate) {
    return await yahooFinance.historical(ticker, {
        period1: new Date(startDate),
        period2: new Date(endDate),
        interval: '1d',
    });
}

function exportToExcel(data, fileName) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '成交量(万)', key: 'volume', width: 20 },
        { header: '收盘价', key: 'close', width: 15 },
        { header: '最高价', key: 'high', width: 15 },
        { header: '最低价', key: 'low', width: 15 },
    ];

    data.forEach(record => {
        worksheet.addRow({
            date: moment(record.date).format('YYYY-MM-DD'),
            volume: Number((record.volume / 10000).toFixed(2)),
            close: record.close,
            high: record.high,
            low: record.low,
        });
    });

    workbook.xlsx.writeFile(fileName)
        .then(() => console.log(`Excel 文件已创建: ${fileName}`))
        .catch(err => console.error('保存 Excel 文件时出错:', err));
}


async function main(ticker, startDate, endDate) {
    try {
        console.log('正在获取数据...');
        const data = await fetchData(ticker, startDate, endDate);

        console.log('正在生成 Excel 文件...');
        exportToExcel(data, `./lesson3/${ticker}_${startDate}_${endDate}_Data.xlsx`);

    } catch (error) {
        console.error('发生错误:', error);
    }
}

// 示例调用
main('^IXIC', '2019-01-01', '2024-12-27');
// main('000001.SS', '2019-01-01', '2024-12-27');
