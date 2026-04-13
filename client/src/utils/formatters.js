/**
 * Smart price formatting based on cryptocurrency price ranges
 * Matches real exchange behavior like Binance/Bybit
 * Updated: 2025-09-24 - Fixed decimal precision for all symbols
 */

export const formatPrice = (price, symbol = "") => {
  const numPrice = parseFloat(price);

  if (isNaN(numPrice) || numPrice === 0) {
    return "0.00";
  }

  // Special handling for specific symbols
  const symbolUpper = symbol.toUpperCase();

  // Meme coins and very low-priced tokens (< $0.01)
  if (
    numPrice < 0.01 ||
    symbolUpper.includes("PEPE") ||
    symbolUpper.includes("SHIB") ||
    symbolUpper.includes("DOGE")
  ) {
    if (numPrice < 0.000001) {
      return numPrice.toFixed(10); // 10 decimals for very small prices
    } else if (numPrice < 0.0001) {
      return numPrice.toFixed(8); // 8 decimals
    } else if (numPrice < 0.001) {
      return numPrice.toFixed(6); // 6 decimals
    } else {
      return numPrice.toFixed(5); // 5 decimals
    }
  }

  // Low-priced coins ($0.01 - $1)
  if (numPrice < 1) {
    return numPrice.toFixed(4);
  }

  // Medium-priced coins ($1 - $100)
  if (numPrice < 100) {
    return numPrice.toFixed(4);
  }

  // High-priced coins ($100 - $10,000)
  if (numPrice < 10000) {
    return numPrice.toFixed(2);
  }

  // Very high-priced coins (> $10,000)
  return numPrice.toFixed(2);
};

export const formatCurrency = (value, options = {}) => {
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 8,
    symbol = "",
    compact = false,
  } = options;

  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return "$0.00";
  }

  // For very large numbers, use compact notation
  if (compact && Math.abs(numValue) >= 1000000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 2,
    }).format(numValue);
  }

  // Smart decimal places based on value
  let maxDecimals = maximumFractionDigits;
  let minDecimals = minimumFractionDigits;

  if (Math.abs(numValue) < 0.01) {
    maxDecimals = 8;
    minDecimals = 6;
  } else if (Math.abs(numValue) < 1) {
    maxDecimals = 6;
    minDecimals = 4;
  } else if (Math.abs(numValue) < 100) {
    maxDecimals = 4;
    minDecimals = 2;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  }).format(numValue);
};

export const formatQuantity = (quantity, symbol = "") => {
  const numQuantity = parseFloat(quantity);

  if (isNaN(numQuantity) || numQuantity === 0) {
    return "0";
  }

  // For very small quantities, show more decimals
  if (numQuantity < 0.000001) {
    return numQuantity.toFixed(10);
  } else if (numQuantity < 0.0001) {
    return numQuantity.toFixed(8);
  } else if (numQuantity < 0.01) {
    return numQuantity.toFixed(6);
  } else if (numQuantity < 1) {
    return numQuantity.toFixed(4);
  } else if (numQuantity < 1000) {
    return numQuantity.toFixed(2);
  } else {
    return numQuantity.toFixed(0);
  }
};

export const formatPercentage = (value, decimals = 2) => {
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    return "0.00%";
  }

  const sign = numValue >= 0 ? "+" : "";
  return `${sign}${numValue.toFixed(decimals)}%`;
};

export const formatVolume = (volume) => {
  const numVolume = parseFloat(volume);

  if (isNaN(numVolume) || numVolume === 0) {
    return "0";
  }

  if (numVolume >= 1000000000) {
    return `${(numVolume / 1000000000).toFixed(2)}B`;
  } else if (numVolume >= 1000000) {
    return `${(numVolume / 1000000).toFixed(2)}M`;
  } else if (numVolume >= 1000) {
    return `${(numVolume / 1000).toFixed(2)}K`;
  } else {
    return numVolume.toFixed(2);
  }
};

// Symbol-specific price precision mapping (like real exchanges)
export const SYMBOL_PRECISION = {
  // Major coins
  BTCUSDT: 2,
  ETHUSDT: 2,
  BNBUSDT: 2,

  // Mid-tier coins
  XRPUSDT: 4,
  ADAUSDT: 4,
  DOTUSDT: 4,
  LINKUSDT: 4,
  LTCUSDT: 2,
  SOLUSDT: 2,
  XLMUSDT: 5,

  // Meme/Low-priced coins
  DOGEUSDT: 5,
  SHIBUSDT: 10,
  SUIUSDT: 4,
};

export const getSymbolPrecision = (symbol) => {
  return SYMBOL_PRECISION[symbol.toUpperCase()] || 4; // Default to 4 decimals
};

export const formatPriceBySymbol = (price, symbol) => {
  const precision = getSymbolPrecision(symbol);
  const numPrice = parseFloat(price);

  if (isNaN(numPrice) || numPrice === 0) {
    return "0." + "0".repeat(Math.min(precision, 2));
  }

  const result = numPrice.toFixed(precision);

  return result;
};
