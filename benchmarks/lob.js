/* eslint-disable @typescript-eslint/no-var-requires */
const Benchmark = require('benchmark')
const hft = require('../dist/cjs/index.js')
const suite = new Benchmark.Suite()

function spamLimitOrders(book, count) {
  for (let i = 0; i < count; i++) {
    book.processLimitOrder('buy', i.toString(), 50, i)
  }
}

//
// MARK: new limits
//
suite
  .add('send 1 new limits', function () {
    const book = new hft.OrderBook()
    spamLimitOrders(book, 1)
  })
  .add('send 10 new limits', function () {
    const book = new hft.OrderBook()
    spamLimitOrders(book, 10)
  })
  .add('send 100 new limits', function () {
    const book = new hft.OrderBook()
    spamLimitOrders(book, 100)
  })
  .add('send 1000 new limits', function () {
    const book = new hft.OrderBook()
    spamLimitOrders(book, 1000)
  })
  // add listeners
  .on('cycle', function (event) {
    console.log(String(event.target))
  })
  //   .on('complete', function () {
  //     console.log('Fastest is ' + this.filter('fastest').map('name'))
  //   })
  // run async
  .run({ async: true })
