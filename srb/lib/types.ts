import type { Signal } from "./signal-engine";

export interface CryptoPair {
  id: string;
  name: string;
}

export interface Timeframe {
  id: string;
  name: string;
}

export interface FullSignal extends Signal {
  status: 'ACTIVE' | 'WIN' | 'LOSS';
}
