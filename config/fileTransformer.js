// source: https://jestjs.io/docs/code-transformation#examples
const path = require('node:path')
module.exports = {
  process (_src, filename) {
    return `module.exports = ${JSON.stringify(path.basename(filename))};`
  }
}
