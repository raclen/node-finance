import yahooFinance from "yahoo-finance2";

yahooFinance
  .chart("000001.SS", {
    period1: "2024-12-23",
    period2: "2024-12-30",
    dataGranularity: '1d',
  })
  .then((result) => {
    console.log(result);
  });
