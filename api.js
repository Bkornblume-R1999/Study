/* api.js — GeoGensan Fare Engine */

const FIREBASE_DB_URL = 'https://gentrike-75c7c-default-rtdb.asia-southeast1.firebasedatabase.app';

// Default fare config (overridden by admin settings from Firebase)
const DEFAULT_FARE_CONFIG = {
  trike: {
    baseFare: 15,
    baseKm: 4,
    perKmRate: 1,
    discountRate: 0.20,
  },
  bus: {
    minimumFare: 30
  }
};

let _fareConfigCache = null;
let _fareConfigExpiry = 0;

export async function getFareConfig() {
  if (_fareConfigCache && Date.now() < _fareConfigExpiry) {
    return _fareConfigCache;
  }
  try {
    const res = await fetch(`${FIREBASE_DB_URL}/fareConfig.json`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.trike) {
        _fareConfigCache = data;
        _fareConfigExpiry = Date.now() + 60000; // cache 1 min
        return data;
      }
    }
  } catch (e) {
    console.warn('Could not load fare config from Firebase, using defaults.', e);
  }
  _fareConfigCache = DEFAULT_FARE_CONFIG;
  _fareConfigExpiry = Date.now() + 30000;
  return DEFAULT_FARE_CONFIG;
}

export function invalidateFareCache() {
  _fareConfigCache = null;
  _fareConfigExpiry = 0;
}

export const Api = {
  async computeFare({ mode, distanceKm, discountType = 'none', regularPassengers = 1, discountedPassengers = 0 }) {
    const config = await getFareConfig();
    const rounded = Math.round(distanceKm * 1000) / 1000;

    let baseFarePerPerson = 0;

    if (mode === 'trike') {
      const { baseFare, baseKm, perKmRate } = config.trike;
      baseFarePerPerson = rounded <= baseKm
        ? baseFare
        : baseFare + Math.ceil(rounded - baseKm) * perKmRate;
    } else if (mode === 'bus' || mode === 'jeep') {
      baseFarePerPerson = config.bus ? config.bus.minimumFare : DEFAULT_FARE_CONFIG.bus.minimumFare;
    } else {
      throw new Error('Unsupported mode');
    }

    const discountRate = config.trike ? config.trike.discountRate : DEFAULT_FARE_CONFIG.trike.discountRate;
    const discountAmountPerPerson = Math.round(baseFarePerPerson * discountRate);
    const discountedFarePerPerson = baseFarePerPerson - discountAmountPerPerson;

    const regularTotal = baseFarePerPerson * regularPassengers;
    const discountedTotal = discountedFarePerPerson * discountedPassengers;
    const totalFare = regularTotal + discountedTotal;

    await new Promise(r => setTimeout(r, 80));

    return {
      mode,
      distanceKm: rounded,
      baseFarePerPerson,
      discountRate,
      discountAmountPerPerson,
      discountedFarePerPerson,
      regularPassengers,
      discountedPassengers,
      regularTotal,
      discountedTotal,
      totalFare,
      config
    };
  }
};
