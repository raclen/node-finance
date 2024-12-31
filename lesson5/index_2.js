const sinaURLPrefix = "https://hq.sinajs.cn/list=";

// 数据结构的定义
class Data {
  constructor() {
    this.Name = '';
    this.Open = 0;
    this.Close = 0;
    this.Now = 0;
    this.High = 0;
    this.Low = 0;
    this.Buy = 0;
    this.Sell = 0;
    this.Turnover = 0;
    this.Volume = 0;
    this.Bid1Volume = 0;
    this.Bid1 = 0;
    this.Bid2Volume = 0;
    this.Bid2 = 0;
    this.Bid3Volume = 0;
    this.Bid3 = 0;
    this.Bid4Volume = 0;
    this.Bid4 = 0;
    this.Bid5Volume = 0;
    this.Bid5 = 0;
    this.Ask1Volume = 0;
    this.Ask1 = 0;
    this.Ask2Volume = 0;
    this.Ask2 = 0;
    this.Ask3Volume = 0;
    this.Ask3 = 0;
    this.Ask4Volume = 0;
    this.Ask4 = 0;
    this.Ask5Volume = 0;
    this.Ask5 = 0;
    this.Date = '';
    this.Time = '';
  }
}

// 获取股票数据
async function getData(stock) {
  const url = sinaURLPrefix + stock;
  try {
    const response = await axios.get(url);
    const body = response.data;
    const t = body.split('"');
    const d = t[1].split(',');

    let data = new Data();
    data.Name = d[0];
    data.Open = parseFloat(d[1]);
    data.Close = parseFloat(d[2]);
    data.Now = parseFloat(d[3]);
    data.High = parseFloat(d[4]);
    data.Low = parseFloat(d[5]);
    data.Buy = parseFloat(d[6]);
    data.Sell = parseFloat(d[7]);
    data.Turnover = parseInt(d[8], 10);
    data.Volume = parseFloat(d[9]);
    data.Bid1Volume = parseInt(d[10], 10);
    data.Bid1 = parseFloat(d[11]);
    data.Bid2Volume = parseInt(d[12], 10);
    data.Bid2 = parseFloat(d[13]);
    data.Bid3Volume = parseInt(d[14], 10);
    data.Bid3 = parseFloat(d[15]);
    data.Bid4Volume = parseInt(d[16], 10);
    data.Bid4 = parseFloat(d[17]);
    data.Bid5Volume = parseInt(d[18], 10);
    data.Bid5 = parseFloat(d[19]);
    data.Ask1Volume = parseInt(d[20], 10);
    data.Ask1 = parseFloat(d[21]);
    data.Ask2Volume = parseInt(d[22], 10);
    data.Ask2 = parseFloat(d[23]);
    data.Ask3Volume = parseInt(d[24], 10);
    data.Ask3 = parseFloat(d[25]);
    data.Ask4Volume = parseInt(d[26], 10);
    data.Ask4 = parseFloat(d[27]);
    data.Ask5Volume = parseInt(d[28], 10);
    data.Ask5 = parseFloat(d[29]);
    data.Date = d[30];
    data.Time = d[31];

    return data;
  } catch (error) {
    console.error("Error fetching stock data:", error);
  }
}

// 转换Tushare格式的股票代码为新浪格式
function tushareToSina(stock) {
  const t = stock.split(".");
  stock = t[1].toLowerCase() + t[0];
  return stock;
}

// getData('sh000001').then(data => {
//     console.log(data);
// })

module.exports = { getData, tushareToSina };
