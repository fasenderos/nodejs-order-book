export class ErrInvalidQuantity extends Error {
  constructor(m: string) {
    super(m)
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrInvalidQuantity.prototype)
  }
}

export class ErrInvalidPrice extends Error {
  constructor(m: string) {
    super(m)
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrInvalidPrice.prototype)
  }
}

export class ErrOrderExists extends Error {
  constructor(m: string) {
    super(m)
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrOrderExists.prototype)
  }
}

export class ErrOrderNotExists extends Error {
  constructor(m: string) {
    super(m)
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrOrderNotExists.prototype)
  }
}

export class ErrInsufficientQuantity extends Error {
  constructor(m: string) {
    super(m)
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ErrInsufficientQuantity.prototype)
  }
}

//  ErrInvalidQuantity      = errors.New("orderbook: invalid order quantity")
// 	ErrInvalidPrice         = errors.New("orderbook: invalid order price")
// 	ErrOrderExists          = errors.New("orderbook: order already exists")
// 	ErrOrderNotExists       = errors.New("orderbook: order does not exist")
// 	ErrInsufficientQuantity = errors.New("orderbook: insufficient quantity to calculate price")
