import { test } from 'tap'
import { CustomError, ErrorCodes, ErrorMessages } from '../src/errors'

void test('Test default CustomError', ({ equal, end }) => {
  const a = CustomError()
  equal(a.message, ErrorMessages.DEFAULT)
  equal(a.code, ErrorCodes.DEFAULT)
  const b = CustomError('foo')
  equal(b.message, `${ErrorMessages.DEFAULT}: foo`)
  equal(a.code, ErrorCodes.DEFAULT)
  end()
})
