export enum ERROR {
  Default = 'Something wrong',
  ErrInsufficientQuantity = 'orderbook: insufficient quantity to calculate price',
  ErrInvalidOrderType = "orderbook: supported order type are 'limit' and 'market'",
  ErrInvalidPrice = 'orderbook: invalid order price',
  ErrInvalidPriceLevel = 'orderbook: invalid order price level',
  ErrInvalidQuantity = 'orderbook: invalid order quantity',
  ErrInvalidSide = "orderbook: given neither 'bid' nor 'ask'",
  ErrInvalidTimeInForce = "orderbook: supported time in force are 'GTC', 'IOC' and 'FOK'",
  ErrLimitFOKNotFillable = 'orderbook: limit FOK order not fillable',
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
    case ERROR.ErrInvalidPriceLevel:
      return new Error(ERROR.ErrInvalidPriceLevel)
    case ERROR.ErrOrderExists:
      return new Error(ERROR.ErrOrderExists)
    case ERROR.ErrInvalidSide:
      return new Error(ERROR.ErrInvalidSide)
    case ERROR.ErrInvalidOrderType:
      return new Error(ERROR.ErrInvalidOrderType)
    case ERROR.ErrInvalidTimeInForce:
      return new Error(ERROR.ErrInvalidTimeInForce)
    case ERROR.ErrLimitFOKNotFillable:
      return new Error(ERROR.ErrLimitFOKNotFillable)
    default:
      error = error === undefined || error === '' ? '' : `: ${error}`
      return new Error(`${ERROR.Default}${error}`)
  }
}
