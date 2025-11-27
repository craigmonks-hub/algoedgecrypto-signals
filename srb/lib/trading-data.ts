export interface MarketData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const basePrices: { [key: string]: number } = {
  'BTC/USDT': 60000,
  'ETH/USDT': 3000,
  'SOL/USDT': 150,
  'DOGE/USDT': 0.15,
  'BNB/USDT': 600,
  'XRP/USDT': 0.5,
  'ADA/USDT': 0.45,
  'AVAX/USDT': 35,
  'LINK/USDT': 18,
  'DOT/USDT': 7,
};

// Function to generate somewhat realistic market data
export function generateMarketData(count: number, pairId: string): MarketData[] {
  const data: MarketData[] = [];
  let lastClose = (basePrices[pairId] || 50000) * (0.9 + Math.random() * 0.2);
  let trend = Math.random() > 0.5 ? 1 : -1;
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const date = new Date(now.getTime() - (count - i) * 60 * 60 * 1000); // H1 timeframe
    
    // Change trend randomly
    if (Math.random() < 0.05) {
      trend *= -1;
    }

    const volatility = 0.02 + Math.random() * 0.03; // 2-5% volatility
    const change = lastClose * volatility * (Math.random() - 0.45) + (lastClose * 0.001 * trend);
    const open = lastClose;
    const close = open + change;
    const high = Math.max(open, close) * (1 + (Math.random() * volatility) / 2);
    const low = Math.min(open, close) * (1 - (Math.random() * volatility) / 2);
    const volume = 1000 + Math.random() * 5000;

    data.push({
      date,
      open,
      high,
      low,
      close,
      volume,
    });

    lastClose = close;
  }
  return data;
}

function getIntervalMilliseconds(interval: string): number {
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1));
    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        default: return 60 * 60 * 1000; // Default to 1 hour
    }
}


export async function fetchBinanceData(pairId: string, interval: string, limit = 300): Promise<MarketData[]> {
  const symbol = pairId.replace('/', '');
  
  // Calculate startTime to fetch the most recent data, ensuring we get up-to-the-minute info.
  const intervalMs = getIntervalMilliseconds(interval);
  const now = Date.now();
  // We request 'limit' candles, so we need to look back 'limit' * 'intervalMs' milliseconds
  // This ensures the data window is always current.
  const startTime = now - (limit * intervalMs);

  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}&startTime=${startTime}`;

  try {
    const response = await fetch(url, { cache: 'no-store' }); // Disable caching to always get fresh data
    if (!response.ok) {
      throw new Error(`Failed to fetch data from Binance: ${response.statusText}`);
    }
    const rawData: (number | string)[][] = await response.json();
    
    if (rawData.length === 0) {
      // Fallback to generated data if the API returns nothing at all
      console.warn("Binance API returned no data, falling back to mock data.");
      return generateMarketData(limit, pairId);
    }
    
    let formattedData: MarketData[] = rawData.map(d => ({
      date: new Date(d[0] as number),
      open: parseFloat(d[1] as string),
      high: parseFloat(d[2] as string),
      low: parseFloat(d[3] as string),
      close: parseFloat(d[4] as string),
      volume: parseFloat(d[5] as string),
    }));

    // Ensure we have exactly `limit` data points by prepending if necessary
    // This handles cases where the API returns slightly fewer than `limit` candles
    if (formattedData.length < limit) {
        const firstDate = formattedData[0].date.getTime();
        const missingPoints = limit - formattedData.length;
        console.warn(`Binance API returned ${formattedData.length} data points, generating ${missingPoints} to fill the gap.`);
        const fallbackData = generateMarketData(missingPoints, pairId).map((d, i) => {
           const newDate = new Date(firstDate - ((missingPoints - i) * intervalMs));
           return {...d, date: newDate };
        });
        formattedData = [...fallbackData, ...formattedData];
    }
    
    return formattedData;

  } catch (error) {
    console.error("Error fetching Binance data, falling back to mock data:", error);
    // Fallback to mock data if API fails for any reason
    return generateMarketData(limit, pairId);
  }
}
