在金融数据分析中，获取股票的历史数据是一项非常常见的需求。Yahoo Finance 提供了一个强大的 `historical` 方法，方便我们查询特定股票在某段时间内的历史行情数据。本文将详细介绍 `historical` 方法的用法、入参和出参，并为您提供示例代码。

* * *

#### 方法简介

`historical` 方法用于获取某个股票在指定时间范围内的历史数据。返回结果通常包括日期、开盘价、收盘价、最高价、最低价、交易量等信息，适用于分析股票的历史趋势。

#### 使用示例

以下是一个基本的使用示例：

```typescript
import yahooFinance from 'yahoo-finance2';

const result = await yahooFinance.historical('AAPL', {
  period1: '2023-01-01',
  period2: '2023-12-31',
});

console.log(result);
```

返回结果示例：

```json
[
  {
    "date": "2023-01-02T00:00:00.000Z",
    "open": 130.5,
    "high": 133.04,
    "low": 130.15,
    "close": 131.86,
    "volume": 100500000,
    "adjClose": 131.86
  },
  {
    "date": "2023-01-03T00:00:00.000Z",
    "open": 131.0,
    "high": 132.45,
    "low": 129.89,
    "close": 130.5,
    "volume": 98000000,
    "adjClose": 130.5
  }
  // …更多数据
]
```

* * *

#### 方法参数

`historical` 方法接受以下参数：

1.  **symbol** (必填):
    
    +   类型: `string`
    +   描述: 股票的符号（如 "AAPL" 代表苹果公司）。
2.  **queryOptions** (可选):
    
    +   类型: `object`
    +   描述: 附加查询选项，具体包括：
        +   `period1` (必填): 起始日期，格式为 `YYYY-MM-DD`。
        +   `period2` (必填): 结束日期，格式为 `YYYY-MM-DD`。
        +   `interval`: 数据间隔，支持 `1d`、`1wk`、`1mo` 等。

示例：

```typescript
const queryOptions = {
  period1: '2023-01-01',
  period2: '2023-12-31',
  interval: '1wk',
};
```

* * *

#### 返回数据说明

返回的数据是一个数组，每个对象表示一天或一个时间间隔内的交易数据。以下是返回字段的详细说明：

字段名 | 类型 | 描述 -- | -- | -- date | string | 日期，ISO 8601 格式。 open | number | 开盘价。 high | number | 最高价。 low | number | 最低价。 close | number | 收盘价。 volume | number | 交易量。 adjClose | number | 调整后的收盘价，考虑了拆股和分红等因素。

* * *

#### 示例代码

以下是一个综合使用的示例，演示如何通过 `historical` 方法获取和分析数据：

```typescript
import yahooFinance from 'yahoo-finance2';

async function getHistoricalData(symbol: string, startDate: string, endDate: string) {
  try {
    const data = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d',
    });

    data.forEach(day => {
      console.log(`Date: ${day.date}, Close: ${day.close}, Volume: ${day.volume}`);
    });
  } catch (error) {
    console.error('Error fetching historical data:', error);
  }
}

getHistoricalData('AAPL', '2023-01-01', '2023-12-31');
```

* * *

#### 注意事项

1.  **时间范围限制**: Yahoo Finance 对查询的时间范围可能有一定限制，通常一次查询的时间范围不能过大。
    
2.  **数据完整性**: 返回的数据可能因节假日或其他原因出现缺失，需要在分析时进行处理。
    
3.  **字段变动**: Yahoo Finance 的 API 字段可能会更新或变动，使用前建议查阅最新文档。
    

* * *

通过本文，您应该对 `historical` 方法的用法有了清晰的认识。在金融数据分析的实际应用中，这一工具可以帮助我们快速获取股票的历史数据，为进一步的分析打下基础。如果您有更多问题或需求，欢迎留言讨论！