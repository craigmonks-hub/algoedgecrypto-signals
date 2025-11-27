function calculateSMA(data: number[], period: number): (number | null)[] {
  const sma: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(null);
    } else {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

export function calculateEMA(data: number[], period: number): (number | null)[] {
  const ema: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let prevEma: number | null = null;

  const initialSmaValues = calculateSMA(data, period);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ema.push(null);
    } else if (i === period - 1) {
      prevEma = initialSmaValues[i];
      ema.push(prevEma);
    } else {
      if(prevEma !== null){
        const currentEma = (data[i] - prevEma) * multiplier + prevEma;
        ema.push(currentEma);
        prevEma = currentEma;
      } else {
        ema.push(null)
      }
    }
  }
  return ema;
}

export function calculateMACD(data: number[], fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
  const emaFast = calculateEMA(data, fastPeriod);
  const emaSlow = calculateEMA(data, slowPeriod);
  
  const macdLine: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (emaFast[i] !== null && emaSlow[i] !== null) {
      macdLine.push(emaFast[i]! - emaSlow[i]!);
    } else {
      macdLine.push(null);
    }
  }
  
  const validMacdData = macdLine.filter(val => val !== null) as number[];
  const signalLinePadded = calculateEMA(validMacdData, signalPeriod);
  
  const signalLine: (number | null)[] = Array(data.length - validMacdData.length).fill(null).concat(signalLinePadded);

  const histogram: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (macdLine[i] !== null && signalLine[i] !== null) {
      histogram.push(macdLine[i]! - signalLine[i]!);
    } else {
      histogram.push(null);
    }
  }

  return { macdLine, signalLine, histogram };
}

export function calculateRSI(data: number[], period = 14): (number | null)[] {
    const rsi: (number | null)[] = Array(data.length).fill(null);
    if (data.length <= period) {
        return rsi;
    }

    const changes = data.map((price, i) => i > 0 ? price - data[i-1] : 0).slice(1);
    
    let initialGains = 0;
    let initialLosses = 0;
    for (let i = 0; i < period; i++) {
        if(changes[i] > 0) initialGains += changes[i];
        else initialLosses -= changes[i];
    }

    let avgGain = initialGains / period;
    let avgLoss = initialLosses / period;

    let rs = avgLoss > 0 ? avgGain / avgLoss : 0;
    rsi[period] = 100 - (100 / (1 + rs));

    for (let i = period; i < changes.length; i++) {
        const change = changes[i];
        let gain = change > 0 ? change : 0;
        let loss = change < 0 ? -change : 0;
        
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        
        rs = avgLoss > 0 ? avgGain / avgLoss : 0;
        rsi[i + 1] = 100 - (100 / (1 + rs));
    }

    return rsi;
}

export function calculateATR(high: number[], low: number[], close: number[], period = 14): (number | null)[] {
  const atr: (number | null)[] = Array(high.length).fill(null);
  if (high.length < period) return atr;

  let tr_sum = 0;
  for (let i = 1; i <= period; i++) {
    const tr = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    tr_sum += tr;
  }
  atr[period] = tr_sum / period;

  for (let i = period + 1; i < high.length; i++) {
    const tr = Math.max(high[i] - low[i], Math.abs(high[i] - close[i - 1]), Math.abs(low[i] - close[i - 1]));
    atr[i] = (atr[i - 1]! * (period - 1) + tr) / period;
  }
  return atr;
}
