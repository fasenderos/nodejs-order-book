const bench = require('nanobench')
const hft = require('../dist/cjs/index.js')
const gaussian = require('gaussian')

/* New Limits */
function spamLimitOrders (book, count) {
  for (let i = 0; i < count; i++) {
    book.limit('buy', i.toString(), 50, i)
  }
}

bench('Spam 1 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 1)
  b.end()
})

bench('Spam 10 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 10)
  b.end()
})

bench('Spam 100 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 100)
  b.end()
})

bench('Spam 1000 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 1000)
  b.end()
})

bench('Spam 100000 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 100000)
  b.end()
})

bench('Spam 300000 new Limits', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitOrders(book, 300000)
  b.end()
})

/* New Orders */
function spamOrders (book, count, variance = 5) {
  for (let i = 0; i < count; i++) {
    book.limit('buy', i.toString(), 50, i % variance)
  }
}

bench('Spam 1 new Orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrders(book, 1)
  b.end()
})

bench('Spam 10 new Orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrders(book, 10)
  b.end()
})

bench('Spam 100 new Orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrders(book, 100)
  b.end()
})

bench('Spam 1000 new Orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrders(book, 1000)
  b.end()
})

/* Random submission and cancellation */
function spamOrdersRandomCancels (
  book,
  count,
  mean = 500,
  variance = 30,
  cancelEvery = 5
) {
  const priceDistribution = gaussian(mean, variance)
  book.limit('buy', '0', 50, priceDistribution.ppf(Math.random()))
  for (let i = 1; i < count; i++) {
    book.limit('buy', i.toString(), 50, priceDistribution.ppf(Math.random()))
    if (i % cancelEvery === 0) book.cancel((i - cancelEvery).toString())
  }
}

bench('Spam 10 orders and randomly cancel orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrdersRandomCancels(book, 10)
  b.end()
})

bench('Spam 100 orders and randomly cancel orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrdersRandomCancels(book, 100)
  b.end()
})

bench('Spam 1000 orders and randomly cancel orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrdersRandomCancels(book, 1000)
  b.end()
})

bench('Spam 10000 orders and randomly cancel orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamOrdersRandomCancels(book, 10000)
  b.end()
})

/* Random submission, cancellation, and market orders */
function spamLimitRandomOrders (
  book,
  count,
  priceMean = 500,
  priceVariance = 20,
  quantityMean = 100,
  quantityVariance = 10,
  orderEvery = 100
) {
  const price = gaussian(priceMean, priceVariance)
  const quantity = gaussian(quantityMean, quantityVariance)
  for (let i = 1; i < count; i++) {
    const price_ = price.ppf(Math.random())
    const quantity_ = quantity.ppf(Math.random())
    book.limit('buy', i.toString(), 100, price_)
    // random submit a market order
    if (i % orderEvery === 0) book.market('sell', quantity_)
  }
}

bench('Spam 1000 limit orders and occasional market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitRandomOrders(book, 1000)
  b.end()
})

bench('Spam 10000 limit orders and occasional market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitRandomOrders(book, 10000)
  b.end()
})

bench('Spam 100000 limit orders and occasional market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitRandomOrders(book, 100000)
  b.end()
})

function spamLimitManyMarketOrders (
  book,
  count,
  priceMean = 500,
  priceVariance = 20,
  quantityMean = 50,
  quantityVariance = 10
) {
  const price = gaussian(priceMean, priceVariance)
  const quantity = gaussian(quantityMean, quantityVariance)

  for (let i = 1; i < count; i++) {
    const price_ = price.ppf(Math.random())
    const quantity_ = quantity.ppf(Math.random())
    book.limit('buy', i.toString(), 100, price_)
    book.market('sell', quantity_)
  }
}

bench('Spam 10 limit orders and constant market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitManyMarketOrders(book, 10)
  b.end()
})

bench('Spam 100 limit orders and constant market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitManyMarketOrders(book, 100)
  b.end()
})

bench('Spam 1000 limit orders and constant market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitManyMarketOrders(book, 1000)
  b.end()
})

bench('Spam 10000 limit orders and constant market orders', function (b) {
  const book = new hft.OrderBook()
  b.start()
  spamLimitManyMarketOrders(book, 10000)
  b.end()
})
