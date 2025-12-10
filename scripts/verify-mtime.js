const { writeFileSync, statSync, utimesSync, unlinkSync } = require('fs')
const { join } = require('path')

const tmp = join(__dirname, 'tmp-mtime-test.txt')

writeFileSync(tmp, 'mtime test')

const before = statSync(tmp).mtime

const now = new Date(946684800000)
utimesSync(tmp, now, now)

const after = statSync(tmp).mtime

console.log('before:', before.toISOString())
console.log('after :', after.toISOString())

unlinkSync(tmp)
