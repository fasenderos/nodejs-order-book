// Define the error enum using an object with keys and values
export enum ERROR {
  DEFAULT = 'DEFAULT',
  INSUFFICIENT_QUANTITY = 'INSUFFICIENT_QUANTITY',
  INVALID_CONDITIONAL_ORDER = 'INVALID_CONDITIONAL_ORDER',
  INVALID_JOURNAL_LOG = 'INVALID_JOURNAL_LOG',
  INVALID_ORDER_TYPE = 'INVALID_ORDER_TYPE',
  INVALID_PRICE = 'INVALID_PRICE',
  INVALID_PRICE_LEVEL = 'INVALID_PRICE_LEVEL',
  INVALID_PRICE_OR_QUANTITY = 'INVALID_PRICE_OR_QUANTITY',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  INVALID_SIDE = 'INVALID_SIDE',
  INVALID_TIF = 'INVALID_TIF',
  LIMIT_ORDER_FOK_NOT_FILLABLE = 'LIMIT_ORDER_FOK_NOT_FILLABLE',
  LIMIT_ORDER_POST_ONLY = 'LIMIT_ORDER_POST_ONLY',
  ORDER_ALREDY_EXISTS = 'ORDER_ALREDY_EXISTS',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',
}

export const ErrorMessages: Record<ERROR, string> = {
  [ERROR.DEFAULT]: 'Something wrong',
  [ERROR.INSUFFICIENT_QUANTITY]:
    'orderbook: insufficient quantity to calculate price',
  [ERROR.INVALID_CONDITIONAL_ORDER]:
    'orderbook: Stop-Limit Order (BUY: marketPrice < stopPrice <= price, SELL: marketPrice > stopPrice >= price). Stop-Market Order (BUY: marketPrice < stopPrice, SELL: marketPrice > stopPrice). OCO order (BUY: price < marketPrice < stopPrice, SELL: price > marketPrice > stopPrice)',
  [ERROR.INVALID_ORDER_TYPE]:
    "orderbook: supported order type are 'limit' and 'market'",
  [ERROR.INVALID_PRICE]: 'orderbook: invalid order price',
  [ERROR.INVALID_PRICE_LEVEL]: 'orderbook: invalid order price level',
  [ERROR.INVALID_PRICE_OR_QUANTITY]:
    'orderbook: invalid order price or quantity',
  [ERROR.INVALID_QUANTITY]: 'orderbook: invalid order quantity',
  [ERROR.INVALID_SIDE]: "orderbook: given neither 'bid' nor 'ask'",
  [ERROR.INVALID_TIF]:
    "orderbook: supported time in force are 'GTC', 'IOC' and 'FOK'",
  [ERROR.LIMIT_ORDER_FOK_NOT_FILLABLE]:
    'orderbook: limit FOK order not fillable',
  [ERROR.LIMIT_ORDER_POST_ONLY]:
    'orderbook: Post-only order rejected because would execute immediately',
  [ERROR.ORDER_ALREDY_EXISTS]: 'orderbook: order already exists',
  [ERROR.ORDER_NOT_FOUND]: 'orderbook: order not found',
  [ERROR.INVALID_JOURNAL_LOG]: 'journal: invalid journal log format'
}

class CustomErrorFactory extends Error {
  constructor (error?: ERROR | string) {
    let errorMessage: string
    if (error != null && ErrorMessages[error as ERROR] != null) {
      errorMessage = ErrorMessages[error as ERROR]
    } else {
      const customMessage = error === undefined || error === '' ? '' : `: ${error}`
      errorMessage = `${ErrorMessages.DEFAULT}${customMessage}`
    }
    super(errorMessage)
  }
}

export const CustomError = (error?: ERROR | string): Error => {
  return new CustomErrorFactory(error)
}
