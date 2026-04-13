import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import binanceWS from "../services/binanceWebSocket";

export const useWebSocket = () => {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    subscriptions: 0,
    reconnectAttempts: 0,
  });
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (initialized) return;

    const updateStatus = () => {
      const newStatus = binanceWS.getConnectionStatus();
      setConnectionStatus((prevStatus) => {
        // Only update if the status actually changed
        if (
          prevStatus.connected !== newStatus.connected ||
          prevStatus.subscriptions !== newStatus.subscriptions ||
          prevStatus.reconnectAttempts !== newStatus.reconnectAttempts
        ) {
          return newStatus;
        }
        return prevStatus;
      });
    };

    const handleConnected = () => {
      updateStatus();
      setError(null);
    };

    const handleDisconnected = () => {
      updateStatus();
    };

    const handleError = (error) => {
      setError((prev) => (prev?.message !== error?.message ? error : prev));
      updateStatus();
    };

    // Set up event listeners
    binanceWS.on("connected", handleConnected);
    binanceWS.on("disconnected", handleDisconnected);
    binanceWS.on("error", handleError);

    // Initial status update
    updateStatus();

    // Connect if not already connected
    if (!binanceWS.isConnected) {
      binanceWS.connect().catch(handleError);
    }

    setInitialized(true);

    return () => {
      binanceWS.off("connected", handleConnected);
      binanceWS.off("disconnected", handleDisconnected);
      binanceWS.off("error", handleError);
    };
  }, [initialized]);

  const connect = useCallback(() => {
    return binanceWS.connect();
  }, []);

  const disconnect = useCallback(() => {
    binanceWS.disconnect();
  }, []);

  return {
    connectionStatus,
    error,
    connect,
    disconnect,
    service: binanceWS,
  };
};

export const useTicker = (symbol) => {
  const [ticker, setTicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!symbol) {
      setTicker(null);
      setLoading(false);
      return;
    }

    const handleTicker = (tickerData) => {
      setTicker((prevTicker) => {
        // Only update if data actually changed
        if (!prevTicker || prevTicker.price !== tickerData.price) {
          return tickerData;
        }
        return prevTicker;
      });
      setLoading(false);
    };

    // Subscribe to ticker updates for this symbol
    binanceWS.on(`ticker:${symbol}`, handleTicker);

    // Subscribe when connected (with a small delay to ensure stability)
    const subscribeWhenReady = () => {
      if (binanceWS.isConnected && !isSubscribed) {
        setTimeout(() => {
          if (binanceWS.isConnected && !isSubscribed) {
            binanceWS.subscribeToPrices([symbol]);
            setIsSubscribed(true);
          }
        }, 100);
      }
    };

    // Subscribe immediately if already connected
    subscribeWhenReady();

    // Listen for connection events
    const handleConnected = () => {
      subscribeWhenReady();
    };

    binanceWS.on("connected", handleConnected);

    // Get initial data if available
    const existingTicker = binanceWS.getTicker(symbol);
    if (existingTicker) {
      setTicker(existingTicker);
      setLoading(false);
    }

    return () => {
      binanceWS.off(`ticker:${symbol}`, handleTicker);
      binanceWS.off("connected", handleConnected);
      setIsSubscribed(false);
    };
  }, [symbol]);

  return { ticker, loading };
};

export const useMultipleTickers = (symbols = []) => {
  const [tickers, setTickers] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasSubscribed, setHasSubscribed] = useState(false);

  // Memoize symbols array to prevent unnecessary re-renders
  const memoizedSymbols = useMemo(() => symbols, [symbols.join(",")]);

  useEffect(() => {
    if (memoizedSymbols.length === 0) return;

    // Debug log

    const handleTicker = ({ symbol, ticker }) => {
      setTickers((prev) => {
        // Only update if ticker actually changed
        if (!prev[symbol] || prev[symbol].price !== ticker.price) {
          const newTickers = { ...prev, [symbol]: ticker };
          return newTickers;
        }
        return prev;
      });
      setLoading(false);
    };

    // Subscribe to ticker updates for all symbols
    binanceWS.on("ticker", handleTicker);

    // Ensure connection and subscribe
    const subscribeToSymbols = async () => {
      if (!binanceWS.isConnected) {
        try {
          await binanceWS.connect();
        } catch (err) {
          return;
        }
      }
      binanceWS.subscribeToPrices(memoizedSymbols);
    };

    subscribeToSymbols();

    // Get initial data if available
    const initialTickers = {};
    memoizedSymbols.forEach((symbol) => {
      const existingTicker = binanceWS.getTicker(symbol);
      if (existingTicker) {
        initialTickers[symbol] = existingTicker;
      }
    });

    if (Object.keys(initialTickers).length > 0) {
      setTickers(initialTickers);
      setLoading(false);
    }

    return () => {
      binanceWS.off("ticker", handleTicker);
    };
  }, [memoizedSymbols]);

  return { tickers, loading };
};

export const useOrderBook = (symbol) => {
  const [orderBook, setOrderBook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const handleOrderBook = (orderBookData) => {
      setOrderBook(orderBookData);
      setLoading(false);
    };

    // Subscribe to order book updates for this symbol
    binanceWS.on(`orderBook:${symbol}`, handleOrderBook);

    // Subscribe to the stream
    binanceWS.subscribeToOrderBook([symbol]);

    // Get initial data if available
    const existingOrderBook = binanceWS.getOrderBook(symbol);
    if (existingOrderBook) {
      setOrderBook(existingOrderBook);
      setLoading(false);
    }

    return () => {
      binanceWS.off(`orderBook:${symbol}`, handleOrderBook);
    };
  }, [symbol]);

  return { orderBook, loading };
};

export const useKlines = (symbol, interval = "1m") => {
  const [klines, setKlines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const handleKline = (klineData) => {
      // Update the klines array with the new data
      setKlines((prev) => {
        const newKlines = [...prev];
        const existingIndex = newKlines.findIndex(
          (k) => k.openTime === klineData.openTime
        );

        if (existingIndex >= 0) {
          newKlines[existingIndex] = klineData;
        } else {
          newKlines.push(klineData);
          // Keep only last 500 klines in component state
          if (newKlines.length > 500) {
            newKlines.shift();
          }
        }

        return newKlines.sort((a, b) => a.openTime - b.openTime);
      });
      setLoading(false);
    };

    // Subscribe to kline updates for this symbol and interval
    binanceWS.on(`kline:${symbol}:${interval}`, handleKline);

    // Subscribe to the stream
    binanceWS.subscribeToKlines([symbol], interval);

    // Get initial data if available
    const existingKlines = binanceWS.getKlineData(symbol, interval);
    if (existingKlines.length > 0) {
      setKlines(existingKlines);
      setLoading(false);
    }

    return () => {
      binanceWS.off(`kline:${symbol}:${interval}`, handleKline);
    };
  }, [symbol, interval]);

  return { klines, loading };
};

export const useMarkPrice = (symbol) => {
  const [markPrice, setMarkPrice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;

    const handleMarkPrice = (markPriceData) => {
      setMarkPrice(markPriceData);
      setLoading(false);
    };

    // Subscribe to mark price updates for this symbol
    binanceWS.on(`markPrice:${symbol}`, handleMarkPrice);

    // Subscribe to the stream
    binanceWS.subscribeToMarkPrice([symbol]);

    return () => {
      binanceWS.off(`markPrice:${symbol}`, handleMarkPrice);
    };
  }, [symbol]);

  return { markPrice, loading };
};

// Hook for real-time price updates with callback
export const usePriceUpdates = (callback) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const handleTicker = ({ symbol, ticker }) => {
      if (callbackRef.current) {
        callbackRef.current(symbol, ticker.price, ticker);
      }
    };

    binanceWS.on("ticker", handleTicker);

    return () => {
      binanceWS.off("ticker", handleTicker);
    };
  }, []);
};

// Hook for managing subscriptions
export const useSubscriptions = () => {
  const subscribeToSymbols = useCallback((symbols, types = ["ticker"]) => {
    types.forEach((type) => {
      switch (type) {
        case "ticker":
          binanceWS.subscribeToPrices(symbols);
          break;
        case "orderbook":
          binanceWS.subscribeToOrderBook(symbols);
          break;
        case "klines":
          binanceWS.subscribeToKlines(symbols);
          break;
        case "markPrice":
          binanceWS.subscribeToMarkPrice(symbols);
          break;
        default:
      }
    });
  }, []);

  const unsubscribeFromSymbols = useCallback((symbols, types = ["ticker"]) => {
    types.forEach((type) => {
      const streams = symbols
        .map((symbol) => {
          switch (type) {
            case "ticker":
              return `${symbol.toLowerCase()}@ticker`;
            case "orderbook":
              return `${symbol.toLowerCase()}@depth20@100ms`;
            case "klines":
              return `${symbol.toLowerCase()}@kline_1m`;
            case "markPrice":
              return `${symbol.toLowerCase()}@markPrice@1s`;
            default:
              return null;
          }
        })
        .filter(Boolean);

      binanceWS.unsubscribeFromStreams(streams);
    });
  }, []);

  return {
    subscribe: subscribeToSymbols,
    unsubscribe: unsubscribeFromSymbols,
  };
};
