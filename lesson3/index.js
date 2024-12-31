const yahooFinance = require('yahoo-finance2').default;
const ExcelJS = require('exceljs');
const moment = require('moment');


let volumeUnitMap = {
    1:'',
    10000:'(万)',
    100000:'(亿)', // A股
    100000000:'(亿)'

}

async function fetchData(ticker, startDate, endDate) {
    return await yahooFinance.historical(ticker, {
        period1: new Date(startDate),
        period2: new Date(endDate),
        interval: '1d',
    });
}


function exportToExcel(data, fileName,volumeUnit) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    worksheet.columns = [
        { header: '日期', key: 'date', width: 15 },
        { header: '成交量'+volumeUnitMap[volumeUnit], key: 'volume', width: 20 },
        { header: '收盘价', key: 'close', width: 15 },
        { header: '开盘价', key: 'open', width: 15 },
        { header: '涨跌幅', key: 'changePercent', width: 15 },
    ];

    data.forEach(record => {
        let cdate = moment(record.date).format('YYYY-MM-DD')
        
        // if(cdate.match(/12-31/)||cdate.match(/12-30/)||cdate.match(/12-29/)){
            const change =  record.close-record.open;
            const changePercent = (change / record.open) * 100;
    
            worksheet.addRow({
                date:cdate,
                volume: Number((record.volume / volumeUnit).toFixed(2)),
                close: record.close,
                open: record.open,
                changePercent: changePercent.toFixed(2) + '%',
            });
        // }
    });
    

    workbook.xlsx.writeFile(fileName)
        .then(() => console.log(`Excel 文件已创建: ${fileName}`))
        .catch(err => console.error('保存 Excel 文件时出错:', err));
}


async function main(ticker, startDate, endDate,volumeUnit) {
    try {
        console.log('正在获取数据...');
        const data = await fetchData(ticker, startDate, endDate);

        console.log('正在生成 Excel 文件...');
        exportToExcel(data, `./lesson3/${ticker}_${startDate}_${endDate}_Data.xlsx`,volumeUnit);

    } catch (error) {
        console.error('发生错误:', error);
    }
}

// 示例调用
// main('^IXIC', '2014-01-01', '2024-12-27',100000000); // 纳斯达克指数
// main('GLD', '2019-01-01', '2024-12-27',1); // 金价
main('000001.SS', '2011-01-02', '2024-12-30',100000); // 上证指数
