import { CustomError, ERROR } from '../src/errors'

describe('CustomError', () => {
  test('test default CustomError', () => {
    const a = CustomError()
    expect(a.message).toBe(ERROR.Default)
    const b = CustomError('foo')
    expect(b.message).toBe(`${ERROR.Default}: foo`)
  })
})
