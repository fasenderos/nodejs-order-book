import { Side } from './side'
import { StopQueue } from './stopqueue'
import { StopSide } from './stopside'
import { OrderType, StopOrder } from './types'

export class StopBook {
  private readonly bids: StopSide
  private readonly asks: StopSide

  constructor () {
    this.bids = new StopSide(Side.BUY)
    this.asks = new StopSide(Side.SELL)
  }

  add = (order: StopOrder): void => {
    const stopSide = order.side === Side.BUY ? this.bids : this.asks
    stopSide.append(order)
  }

  getConditionalOrders = (
    oppositeSide: Side,
    upperBound: number,
    lowerBound: number
  ): StopQueue[] => {
    const stopSide = oppositeSide === Side.BUY ? this.asks : this.bids
    return stopSide.between(upperBound, lowerBound)
  }

  /**
   * Stop-Limit Order:
   *    Buy: marketPrice < stopPrice <= price
   *    Sell: marketPrice > stopPrice >= price
   * Stop-Market Order:
   *    Buy: marketPrice < stopPrice
   *    Sell: marketPrice > stopPrice
   */
  validConditionalOrder = (marketPrice: number, order: StopOrder): boolean => {
    let response = false
    const { type, side, stopPrice } = order
    if (type === OrderType.STOP_LIMIT) {
      if (
        side === Side.BUY &&
        marketPrice < stopPrice &&
        stopPrice <= order.price
      ) {
        response = true
      }
      if (
        side === Side.SELL &&
        marketPrice > stopPrice &&
        stopPrice >= order.price
      ) {
        response = true
      }
    } else {
      if (side === Side.BUY && marketPrice < stopPrice) response = true
      if (side === Side.SELL && marketPrice > stopPrice) response = true
    }
    return response
  }
}
