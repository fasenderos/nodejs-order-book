import { test } from 'tap'
import { CustomError, ErrorMessages } from '../src/errors'

void test('Test default CustomError', ({ equal, end }) => {
  const a = CustomError()
  equal(a.message, ErrorMessages.DEFAULT)
  const b = CustomError('foo')
  equal(b.message, `${ErrorMessages.DEFAULT}: foo`)
  end()
})
