export enum ERROR {
  Default = 'Something wrong',
  ErrInvalidQuantity = 'orderbook: invalid order quantity',
  ErrInsufficientQuantity = 'orderbook: insufficient quantity to calculate price',
  ErrInvalidPrice = 'orderbook: invalid order price',
  ErrOrderExists = 'orderbook: order already exists',
}

export const CustomError = (error?: ERROR | string): Error => {
  switch (error) {
    case ERROR.ErrInvalidQuantity:
      return new Error(ERROR.ErrInvalidQuantity)
    case ERROR.ErrInsufficientQuantity:
      return new Error(ERROR.ErrInsufficientQuantity)
    case ERROR.ErrInvalidPrice:
      return new Error(ERROR.ErrInvalidPrice)
    case ERROR.ErrOrderExists:
      return new Error(ERROR.ErrOrderExists)
    default:
      return new Error(`${ERROR.Default}${error ? ': ' + error : ''}`)
  }
}
