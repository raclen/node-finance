const yahooFinance = require("yahoo-finance2").default;

yahooFinance
  .historical("AAPL", {
    period1: "2024-12-23",
    period2: "2024-12-31",
  })
  .then((result) => {
    console.table(result);
  });
