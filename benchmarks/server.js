/* eslint-disable @typescript-eslint/no-var-requires */
const crypto = require('crypto')
const fastify = require('fastify')()
const hft = require('../dist/cjs/index.js')

const book = new hft.OrderBook()

const randomIntFromInterval = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1) + min)
}

const memoryUsage = () => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024
  const message = `The script uses approximately ${
    Math.round(used * 100) / 100
  } MB`
  console.log(message)
  return message
}

// route used by autocannon to spam orders
fastify.get('/', (request, reply) => {
  const id = crypto.randomUUID()
  const side = Math.random() < 0.5 ? 'buy' : 'sell'
  const price = randomIntFromInterval(50, 100)
  const size = randomIntFromInterval(1, 10)
  book.processLimitOrder(side, id, size, price)
  reply.send()
})
// get depth, route to be called after running benchmarg
fastify.get('/depth', (request, reply) => {
  reply.send(book.depth())
})

// get depth, route to be called after running benchmarg
fastify.get('/memory', (request, reply) => {
  reply.send(memoryUsage())
})

// Run the server!
fastify.listen({ port: 3000 }, (err, address) => {
  if (err) throw err
  console.log(`Server is now listening on ${address}`)
})
