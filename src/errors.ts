/* node:coverage ignore next - Don't know why first and last line of each file count as uncovered */
import { IError } from './types'

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

export const ErrorCodes: Record<ERROR, number> = {
  // 10xx General issues
  [ERROR.DEFAULT]: 1000,

  // 11xx Request issues
  [ERROR.INVALID_ORDER_TYPE]: 1100,
  [ERROR.INVALID_SIDE]: 1101,
  [ERROR.INVALID_QUANTITY]: 1102,
  [ERROR.INVALID_PRICE]: 1103,
  [ERROR.INVALID_PRICE_OR_QUANTITY]: 1104,
  [ERROR.INVALID_TIF]: 1105,
  [ERROR.LIMIT_ORDER_FOK_NOT_FILLABLE]: 1106,
  [ERROR.LIMIT_ORDER_POST_ONLY]: 1107,
  [ERROR.INVALID_CONDITIONAL_ORDER]: 1108,
  [ERROR.ORDER_ALREDY_EXISTS]: 1109,
  [ERROR.ORDER_NOT_FOUND]: 1110,

  // 12xx Internal error
  [ERROR.INSUFFICIENT_QUANTITY]: 1200,
  [ERROR.INVALID_PRICE_LEVEL]: 1201,
  [ERROR.INVALID_JOURNAL_LOG]: 1201
}

export const ErrorMessages: Record<ERROR, string> = {
  [ERROR.DEFAULT]: 'Something wrong',
  [ERROR.INSUFFICIENT_QUANTITY]: 'Insufficient quantity to calculate price',
  [ERROR.INVALID_CONDITIONAL_ORDER]: 'Stop-Limit Order (BUY: marketPrice < stopPrice <= price, SELL: marketPrice > stopPrice >= price). Stop-Market Order (BUY: marketPrice < stopPrice, SELL: marketPrice > stopPrice). OCO order (BUY: price < marketPrice < stopPrice, SELL: price > marketPrice > stopPrice)',
  [ERROR.INVALID_ORDER_TYPE]: "Supported order type are 'limit' and 'market'",
  [ERROR.INVALID_PRICE]: 'Invalid order price',
  [ERROR.INVALID_PRICE_LEVEL]: 'Invalid order price level',
  [ERROR.INVALID_PRICE_OR_QUANTITY]: 'Invalid order price or quantity',
  [ERROR.INVALID_QUANTITY]: 'Invalid order quantity',
  [ERROR.INVALID_SIDE]: "Invalid side: must be either 'sell' or 'buy'",
  [ERROR.INVALID_TIF]: "Invalid TimeInForce: must be one of 'GTC', 'IOC' or 'FOK'",
  [ERROR.LIMIT_ORDER_FOK_NOT_FILLABLE]: 'Limit FOK order not fillable',
  [ERROR.LIMIT_ORDER_POST_ONLY]: 'Post-only limit order rejected because would execute immediately',
  [ERROR.ORDER_ALREDY_EXISTS]: 'Order already exists',
  [ERROR.ORDER_NOT_FOUND]: 'Order not found',
  [ERROR.INVALID_JOURNAL_LOG]: 'Invalid journal log format'
}

export class OrderBookError implements IError {
  message: string
  code: number
  constructor (error?: ERROR | string) {
    let errorMessage: string
    if (error != null && ErrorMessages[error as ERROR] != null) {
      errorMessage = ErrorMessages[error as ERROR]
    } else {
      const customMessage = error === undefined || error === '' ? '' : `: ${error}`
      errorMessage = `${ErrorMessages.DEFAULT}${customMessage}`
    }
    this.message = errorMessage
    this.code = ErrorCodes[error as ERROR] ?? ErrorCodes[ERROR.DEFAULT]
  }
}
/* node:coverage ignore next - Don't know why this line is uncoverd */
export const CustomError = (error?: ERROR | string): OrderBookError => {
  return new OrderBookError(error)
}
