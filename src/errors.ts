export enum ERROR {
  Default = 'Something wrong',
  ErrInsufficientQuantity = 'orderbook: insufficient quantity to calculate price',
  ErrInvalidConditionalOrder = 'orderbook: Stop-Limit Order (BUY: marketPrice < stopPrice <= price, SELL: marketPrice > stopPrice >= price). Stop-Market Order (BUY: marketPrice < stopPrice, SELL: marketPrice > stopPrice). OCO order (BUY: price < marketPrice < stopPrice, SELL: price > marketPrice > stopPrice)',
  ErrInvalidOrderType = "orderbook: supported order type are 'limit' and 'market'",
  ErrInvalidPrice = 'orderbook: invalid order price',
  ErrInvalidPriceLevel = 'orderbook: invalid order price level',
  ErrInvalidPriceOrQuantity = 'orderbook: invalid order price or quantity',
  ErrInvalidQuantity = 'orderbook: invalid order quantity',
  ErrInvalidSide = "orderbook: given neither 'bid' nor 'ask'",
  ErrInvalidTimeInForce = "orderbook: supported time in force are 'GTC', 'IOC' and 'FOK'",
  ErrLimitFOKNotFillable = 'orderbook: limit FOK order not fillable',
  ErrLimitOrderPostOnly = 'orderbook: Post-only order rejected because would execute immediately',
  ErrOrderExists = 'orderbook: order already exists',
  ErrOrderNotFound = 'orderbook: order not found',
  ErrJournalLog = 'journal: invalid journal log format',
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
    case ERROR.ErrInvalidPriceOrQuantity:
      return new Error(ERROR.ErrInvalidPriceOrQuantity)
    case ERROR.ErrOrderExists:
      return new Error(ERROR.ErrOrderExists)
    case ERROR.ErrOrderNotFound:
      return new Error(ERROR.ErrOrderNotFound)
    case ERROR.ErrInvalidSide:
      return new Error(ERROR.ErrInvalidSide)
    case ERROR.ErrInvalidConditionalOrder:
      return new Error(ERROR.ErrInvalidConditionalOrder)
    case ERROR.ErrInvalidOrderType:
      return new Error(ERROR.ErrInvalidOrderType)
    case ERROR.ErrInvalidTimeInForce:
      return new Error(ERROR.ErrInvalidTimeInForce)
    case ERROR.ErrLimitFOKNotFillable:
      return new Error(ERROR.ErrLimitFOKNotFillable)
    case ERROR.ErrLimitOrderPostOnly:
      return new Error(ERROR.ErrLimitOrderPostOnly)
    case ERROR.ErrJournalLog:
      return new Error(ERROR.ErrJournalLog)
    default:
      error = error === undefined || error === '' ? '' : `: ${error}`
      return new Error(`${ERROR.Default}${error}`)
  }
}
