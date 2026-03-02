import { Source } from "./DataFecther"

export const dev = true

export const source: Source = dev ? Source.yfinance : Source.binance
