import { CustomError, ERROR } from '../src/errors'
import { test } from 'tap'

test('Test default CustomError', ({ equal, end }) => {
  const a = CustomError()
  equal(a.message, ERROR.Default)
  const b = CustomError('foo')
  equal(b.message, `${ERROR.Default}: foo`)
  end()
})
