export enum ERROR {
  Default = 'Something wrong',
  ErrInvalidQuantity = 'orderbook: invalid order quantity',
  ErrInsufficientQuantity = 'orderbook: insufficient quantity to calculate price',
  ErrInvalidPrice = 'orderbook: invalid order price',
  ErrInvalidPriceLevel = 'orderbook: invalid order price level',
  ErrInvalidSide = "orderbook: given neither 'bid' nor 'ask'",
  ErrOrderExists = 'orderbook: order already exists',
  ErrInvalidOrderType = "orderbook: supperted order type are 'limit' and 'market'",
}

export const CustomError = (error?: ERROR | string): Error => {
  switch (error) {
    case ERROR.ErrInvalidQuantity:
      return new Error(ERROR.ErrInvalidQuantity)
    case ERROR.ErrInsufficientQuantity:
      return new Error(ERROR.ErrInsufficientQuantity)
    case ERROR.ErrInvalidPrice:
      return new Error(ERROR.ErrInvalidPrice)
    case ERROR.ErrInvalidPriceLevel:
      return new Error(ERROR.ErrInvalidPriceLevel)
    case ERROR.ErrOrderExists:
      return new Error(ERROR.ErrOrderExists)
    case ERROR.ErrInvalidSide:
      return new Error(ERROR.ErrInvalidSide)
    case ERROR.ErrInvalidOrderType:
      return new Error(ERROR.ErrInvalidOrderType)
    default:
      return new Error(`${ERROR.Default}${error ? ': ' + error : ''}`)
  }
}
