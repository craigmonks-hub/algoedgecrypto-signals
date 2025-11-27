import type { MarketData } from "./trading-data";
import { calculateEMA, calculateMACD, calculateRSI, calculateATR } from "./indicators";

export interface Signal {
  id: string; // Unique ID for the signal
  pair: string;
  timeframe: string;
  timestamp: number;
  direction: "BUY" | "SELL" | "HOLD";
  currentPrice: number;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  reasoning: string[];
  indicatorData: {
    ema50: (number | null)[];
    ema200: (number | null)[];
    macdLine: (number | null)[];
    signalLine: (number | null)[];
    histogram: (number | null)[];
    rsi: (number | null)[];
    atr: (number | null)[];
  };
}

const RISK_REWARD_RATIO = 1.5;
const ATR_MULTIPLIER = 2; // How many ATRs to place the stop loss

export function analyzeData(data: MarketData[]): Omit<Signal, 'pair' | 'timeframe' | 'status'> {
  const closePrices = data.map(d => d.close);
  const highPrices = data.map(d => d.high);
  const lowPrices = data.map(d => d.low);
  const len = closePrices.length;
  const currentPrice = closePrices[len - 1] || 0;
  const timestamp = data[len - 1]?.date.getTime() || Date.now();
  
  const ema50 = calculateEMA(closePrices, 50);
  const ema200 = calculateEMA(closePrices, 200);
  const { macdLine, signalLine, histogram } = calculateMACD(closePrices);
  const rsi = calculateRSI(closePrices, 14);
  const atr = calculateATR(highPrices, lowPrices, closePrices, 14);

  const indicatorData = { ema50, ema200, macdLine, signalLine, histogram, rsi, atr };
  
  const baseSignal = {
    id: `HOLD-${timestamp}`,
    timestamp,
    currentPrice,
    entryPrice: null,
    stopLoss: null,
    takeProfit: null,
    indicatorData,
  };

  if (len < 200) {
    return {
      ...baseSignal,
      direction: "HOLD",
      reasoning: ["Not enough data points to generate signals."],
    };
  }
  
  const currentEma50 = ema50[len - 1];
  const currentEma200 = ema200[len - 1];
  const currentMacd = macdLine[len - 1];
  const currentSignal = signalLine[len - 1];
  const currentRsi = rsi[len - 1];
  const currentAtr = atr[len - 1];
  
  const allDataAvailable = [
    currentPrice, currentEma50, currentEma200,
    currentMacd, currentSignal, currentRsi, currentAtr
  ].every(v => v !== null && v !== undefined);

  if (!allDataAvailable) {
    return {
      ...baseSignal,
      direction: "HOLD",
      reasoning: ["Indicators are still calculating."],
    };
  }

  // ---=== HIGH-ACCURACY BUY SIGNAL (CONFLUENCE STRATEGY) ===---
  const isUptrend = currentEma50! > currentEma200!;
  const isPriceActionBullish = currentPrice > currentEma50!;
  const isMacdBullish = currentMacd! > currentSignal! && currentMacd! > 0;
  const isRsiBullish = currentRsi! > 55;
  
  if (isUptrend && isPriceActionBullish && isMacdBullish && isRsiBullish) {
    const reasoning = [
      `Uptrend Confirmed: EMA (50) is above EMA (200).`,
      `Bullish Price Action: Price is trading above the EMA (50).`,
      `Bullish Momentum: MACD is positive and above its signal line.`,
      `Strong Momentum: RSI is above 55, indicating strong buying pressure.`
    ];
    const entryPrice = currentPrice;
    const stopLoss = entryPrice - (currentAtr! * ATR_MULTIPLIER);
    const takeProfit = entryPrice + (entryPrice - stopLoss) * RISK_REWARD_RATIO;
    return { 
      ...baseSignal,
      id: `BUY-${timestamp}`,
      direction: "BUY", 
      entryPrice, 
      stopLoss, 
      takeProfit, 
      reasoning, 
    };
  }

  // ---=== HIGH-ACCURACY SELL SIGNAL (CONFLUENCE STRATEGY) ===---
  const isDowntrend = currentEma50! < currentEma200!;
  const isPriceActionBearish = currentPrice < currentEma50!;
  const isMacdBearish = currentMacd! < currentSignal! && currentMacd! < 0;
  const isRsiBearish = currentRsi! < 45;

  if (isDowntrend && isPriceActionBearish && isMacdBearish && isRsiBearish) {
    const reasoning = [
      `Downtrend Confirmed: EMA (50) is below EMA (200).`,
      `Bearish Price Action: Price is trading below the EMA (50).`,
      `Bearish Momentum: MACD is negative and below its signal line.`,
      `Strong Momentum: RSI is below 45, indicating strong selling pressure.`
    ];
    const entryPrice = currentPrice;
    const stopLoss = entryPrice + (currentAtr! * ATR_MULTIPLIER);
    const takeProfit = entryPrice - (stopLoss - entryPrice) * RISK_REWARD_RATIO;
    return { 
      ...baseSignal,
      id: `SELL-${timestamp}`,
      direction: "SELL", 
      entryPrice, 
      stopLoss, 
      takeProfit, 
      reasoning, 
    };
  }

  return {
    ...baseSignal,
    direction: "HOLD",
    reasoning: ["No high-confluence signal conditions met. Waiting for alignment."],
  };
}
