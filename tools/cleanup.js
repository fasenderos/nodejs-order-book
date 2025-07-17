const fs = require('node:fs')
const Path = require('node:path')

const deleteFolderRecursive = (path) => {
  if (fs.existsSync(path)) {
    for (const file of fs.readdirSync(path)) {
      const curPath = Path.join(path, file)
      if (fs.lstatSync(curPath).isDirectory()) {
        deleteFolderRecursive(curPath)
      } else {
        fs.unlinkSync(curPath)
      } 
    }
    fs.rmdirSync(path)
  }
}

const folder = process.argv.slice(2)[0]

if (folder) {
  deleteFolderRecursive(Path.join(__dirname, '../dist', folder))
} else {
  deleteFolderRecursive(Path.join(__dirname, '../dist/cjs'))
  deleteFolderRecursive(Path.join(__dirname, '../dist/esm'))
  deleteFolderRecursive(Path.join(__dirname, '../dist/types'))
}
