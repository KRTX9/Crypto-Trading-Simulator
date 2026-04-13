import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import {
  useWebSocket,
  usePriceUpdates,
  useMultipleTickers,
} from "../hooks/useWebSocket";
import tradingService from "../services/tradingService";
import authService from "../services/authService";

const TradingContext = createContext();

export function useTrading() {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error("useTrading must be used within a TradingProvider");
  }
  return context;
}

export function TradingProvider({ children }) {
  const { user } = useAuth();
  const [accountSummary, setAccountSummary] = useState(null);
  const [positions, setPositions] = useState([]);
  const [orders, setOrders] = useState([]);
  const [trades, setTrades] = useState([]);
  const [marketData, setMarketData] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Debounce mechanism to prevent excessive API calls
  const refreshTimeoutRef = useRef(null);

  // Debounced refresh function
  const debouncedRefresh = useCallback(
    (delay = 200) => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = setTimeout(async () => {
        if (user && authService.isAuthenticated()) {
          try {
            // Direct API calls to avoid dependency issues
            const [accountData, positionsData] = await Promise.all([
              tradingService.getAccountSummary(),
              tradingService.getPositions(),
            ]);

            setAccountSummary(accountData);
            setPositions(positionsData);

            // Less frequent updates for orders and trades
            if (Math.random() > 0.5) {
              const [ordersData, tradesData] = await Promise.all([
                tradingService.getOrders(15),
                tradingService.getTrades(15),
              ]);
              setOrders(ordersData);
              setTrades(tradesData);
            }
          } catch (error) {
            console.error("Failed to refresh data:", error);
          }
        }
      }, delay);
    },
    [user?.id] // Only depend on user ID
  );

  // WebSocket integration
  const {
    connectionStatus,
    error: wsError,
    connect: wsConnect,
  } = useWebSocket();
  const symbols = [
    "BTCUSDT",
    "ETHUSDT",
    "ADAUSDT",
    "BNBUSDT",
    "DOTUSDT",
    "XRPUSDT",
    "SOLUSDT",
    "SUIUSDT",
    "DOGEUSDT",
    "LINKUSDT",
    "XLMUSDT",
    "LTCUSDT",
  ];
  const { tickers: realTimeTickers, loading: tickersLoading } =
    useMultipleTickers(symbols);

  // Initialize WebSocket connection on mount
  useEffect(() => {
    if (!connectionStatus.connected && !connectionStatus.reconnectAttempts) {
      wsConnect().catch(() => {
        // Silent catch - WebSocket will auto-reconnect
      });
    }
  }, []); // Run only once on mount

  // Fetch account summary
  const fetchAccountSummary = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const summary = await tradingService.getAccountSummary();
      setAccountSummary(summary);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch account summary:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch positions
  const fetchPositions = useCallback(async () => {
    if (!user) return;

    try {
      const positions = await tradingService.getPositions();
      setPositions(positions);
    } catch (err) {
      setError(err.message);
      setPositions([]);
    }
  }, [user]);

  // Fetch orders
  const fetchOrders = useCallback(
    async (limit = 50) => {
      if (!user) return;

      try {
        const orders = await tradingService.getOrders(limit);
        setOrders(orders);
      } catch (err) {
        setError(err.message);
        setOrders([]);
      }
    },
    [user]
  );

  // Fetch trades
  const fetchTrades = useCallback(
    async (limit = 50) => {
      if (!user) return;

      try {
        const trades = await tradingService.getTrades(limit);
        setTrades(trades);
      } catch (err) {
        setError(err.message);
        setTrades([]);
      }
    },
    [user]
  );

  // Memoize market data processing to avoid unnecessary calculations
  const processedMarketData = useMemo(() => {
    if (realTimeTickers && Object.keys(realTimeTickers).length > 0) {
      return Object.entries(realTimeTickers).map(([symbol, ticker]) => {
        return {
          symbol,
          price: ticker.price,
          mark_price: ticker.price, // For demo, use same as price
          price_change_24h: ticker.priceChangePercent,
          high_24h: ticker.high,
          low_24h: ticker.low,
          volume_24h: ticker.volume,
        };
      });
    }
    return [];
  }, [realTimeTickers]);

  // Update market data from processed data with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMarketData(processedMarketData);
    }, 100); // Small debounce to prevent rapid updates

    return () => clearTimeout(timeoutId);
  }, [processedMarketData]);

  // Market data is now handled entirely by real-time WebSocket data

  // Store positions that need to be closed due to SL/TP triggers
  const [positionsToClose, setPositionsToClose] = useState([]);

  // Use refs to access current state without causing re-renders
  const ordersRef = useRef(orders);
  const positionsRef = useRef(positions);
  
  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);
  
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);
  
  // Real-time PnL updates for positions and limit order execution
  usePriceUpdates(
    useCallback(
      (symbol, price) => {
        // Only update backend if user is authenticated
        if (!user) return;

        // Check if we have positions or pending orders for this symbol
        const hasPositionForSymbol = positionsRef.current.some((p) => p.symbol === symbol);
        const hasPendingOrderForSymbol = ordersRef.current.some(
          (o) => o.symbol === symbol && o.status === 'PENDING'
        );
        
        // Update backend if we have positions or pending orders
        const shouldUpdateBackend = hasPositionForSymbol || hasPendingOrderForSymbol;
        
        if (shouldUpdateBackend) {
          // Update backend with real-time price (throttled to prevent excessive calls)
          const updateBackendPrice = async () => {
            try {
              const result = await tradingService.updateMarketPrice(symbol, price);
              // If any limit orders were executed, update data silently
              if (result && result.executed_limit_orders > 0) {
                // Fetch data in background without blocking
                Promise.all([
                  tradingService.getOrders(20),
                  tradingService.getPositions(),
                  tradingService.getTrades(20),
                  tradingService.getAccountSummary()
                ]).then(([ordersData, positionsData, tradesData, accountData]) => {
                  // Update state directly without causing re-renders
                  setOrders(ordersData);
                  setPositions(positionsData);
                  setTrades(tradesData);
                  setAccountSummary(accountData);
                }).catch(() => {
                  // Silent catch
                });
              }
            } catch (error) {
              // Silently handle errors to not disrupt real-time updates
            }
          };

          // Throttle backend updates to every 1 second per symbol
          const throttleKey = `price_update_${symbol}`;
          if (!window.priceUpdateThrottles) {
            window.priceUpdateThrottles = {};
          }

          if (!window.priceUpdateThrottles[throttleKey]) {
            window.priceUpdateThrottles[throttleKey] = true;
            updateBackendPrice();
            setTimeout(() => {
              delete window.priceUpdateThrottles[throttleKey];
            }, 1000); // Reduced to 1 second for more responsive limit orders
          }
        }

        // Only update positions if we have them for this symbol
        if (hasPositionForSymbol) {
          setPositions((prevPositions) => {
            return prevPositions.map((position) => {
            if (position.symbol === symbol) {
              const updatedPosition = { ...position };

              // Update mark price with current market price
              updatedPosition.mark_price = parseFloat(price);

              // Calculate unrealized PnL based on current price
              const currentPrice = parseFloat(price);
              const entryPrice = parseFloat(position.entry_price);
              const size = parseFloat(position.size);

              let pnl;
              if (position.side === "LONG" || position.side === "Long") {
                pnl = (currentPrice - entryPrice) * size;
              } else {
                pnl = (entryPrice - currentPrice) * size;
              }

              updatedPosition.unrealized_pnl = pnl;

              // Recalculate liquidation price
              const maintenanceMarginRate = 0.004; // 0.4%
              const leverage = position.leverage;
              if (position.side === "LONG" || position.side === "Long") {
                updatedPosition.liquidation_price =
                  entryPrice * (1 - 1 / leverage + maintenanceMarginRate);
              } else {
                updatedPosition.liquidation_price =
                  entryPrice * (1 + 1 / leverage - maintenanceMarginRate);
              }

              // Check for stop loss and take profit triggers (only if position hasn't been triggered)
              if (
                position.stop_loss &&
                position.stop_loss > 0 &&
                !position.sl_triggered
              ) {
                const shouldTriggerStopLoss =
                  position.side === "LONG" || position.side === "Long"
                    ? currentPrice <= position.stop_loss
                    : currentPrice >= position.stop_loss;

                if (shouldTriggerStopLoss) {
                  // Add to positions to close queue
                  setPositionsToClose((prev) => {
                    // Check if already in queue to prevent duplicates
                    const alreadyQueued = prev.some(
                      (item) =>
                        item.positionId === position.id && item.type === "SL"
                    );
                    if (!alreadyQueued) {
                      return [
                        ...prev,
                        {
                          positionId: position.id,
                          type: "SL",
                          price: currentPrice,
                          symbol,
                        },
                      ];
                    }
                    return prev;
                  });
                  // Mark this position as triggered to prevent multiple triggers
                  updatedPosition.sl_triggered = true;
                }
              }

              if (
                position.take_profit &&
                position.take_profit > 0 &&
                !position.tp_triggered
              ) {
                const shouldTriggerTakeProfit =
                  position.side === "LONG" || position.side === "Long"
                    ? currentPrice >= position.take_profit
                    : currentPrice <= position.take_profit;

                if (shouldTriggerTakeProfit) {
                  // Add to positions to close queue
                  setPositionsToClose((prev) => {
                    // Check if already in queue to prevent duplicates
                    const alreadyQueued = prev.some(
                      (item) =>
                        item.positionId === position.id && item.type === "TP"
                    );
                    if (!alreadyQueued) {
                      return [
                        ...prev,
                        {
                          positionId: position.id,
                          type: "TP",
                          price: currentPrice,
                          symbol,
                        },
                      ];
                    }
                    return prev;
                  });
                  // Mark this position as triggered to prevent multiple triggers
                  updatedPosition.tp_triggered = true;
                }
              }

              return updatedPosition;
            }
            return position;
          });
        });
        }
      },
      [user] // Only depend on user to prevent re-renders
    )
  );

  // Memoize expensive calculations for account summary
  const accountCalculations = useMemo(() => {
    const totalUnrealizedPnL = positions.reduce(
      (sum, pos) => sum + (parseFloat(pos.unrealized_pnl) || 0),
      0
    );
    const totalMarginUsed = positions.reduce(
      (sum, pos) => sum + (parseFloat(pos.margin) || 0),
      0
    );

    return {
      totalUnrealizedPnL,
      totalMarginUsed,
    };
  }, [positions]);

  // Update account summary when calculated values change (debounced to prevent flickering)
  useEffect(() => {
    const updateAccountSummary = () => {
      if (positions.length > 0) {
        const { totalUnrealizedPnL, totalMarginUsed } = accountCalculations;

        setAccountSummary((prev) => {
          if (!prev) return prev;

          const balance = parseFloat(prev.balance) || 0;
          const newEquity = balance + totalUnrealizedPnL;
          const availableBalance = Math.max(0, newEquity - totalMarginUsed);
          const marginRatio =
            newEquity > 0 ? (totalMarginUsed / newEquity) * 100 : 0;

          // Always update to ensure real-time accuracy
          return {
            ...prev,
            margin_used: totalMarginUsed,
            unrealized_pnl: totalUnrealizedPnL,
            total_equity: newEquity,
            available_balance: availableBalance,
            margin_ratio: marginRatio,
          };
        });
      } else if (positions.length === 0 && accountSummary) {
        // Reset to initial state when no positions
        setAccountSummary((prev) =>
          prev && prev.margin_used > 0
            ? {
                ...prev,
                margin_used: 0,
                unrealized_pnl: 0,
                total_equity: prev.balance,
                available_balance: prev.balance,
                margin_ratio: 0,
              }
            : prev
        );
      }
    };

    // Reduce debounce for better responsiveness
    const timeoutId = setTimeout(updateAccountSummary, 50);
    return () => clearTimeout(timeoutId);
  }, [
    accountCalculations.totalUnrealizedPnL,
    accountCalculations.totalMarginUsed,
    positions.length,
    accountSummary?.balance,
  ]);

  // Real-time trading engine
  const executeOrder = useCallback(
    (orderRequest, currentPrice) => {
      const orderId = `order-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
      const timestamp = new Date().toISOString();

      // Calculate order execution details
      const executionPrice =
        orderRequest.type === "MARKET" ? currentPrice : orderRequest.price;
      const notionalValue = orderRequest.quantity * executionPrice;
      const marginRequired = notionalValue / orderRequest.leverage;
      const commission = notionalValue * 0.00055; // 0.055% commission (Bybit rate)

      // Check available balance
      if (
        !accountSummary ||
        accountSummary.available_balance < marginRequired
      ) {
        throw new Error("Insufficient balance");
      }

      // Create order record
      const newOrder = {
        id: orderId,
        user_id: user.id,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        type: orderRequest.type,
        quantity: orderRequest.quantity,
        price: orderRequest.type === "LIMIT" ? orderRequest.price : null,
        status: "FILLED",
        filled_quantity: orderRequest.quantity,
        average_fill_price: executionPrice,
        leverage: orderRequest.leverage,
        reduce_only: orderRequest.reduce_only || false,
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Create trade record
      const newTrade = {
        id: `trade-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        order_id: orderId,
        user_id: user.id,
        symbol: orderRequest.symbol,
        side: orderRequest.side,
        quantity: orderRequest.quantity,
        price: executionPrice,
        commission,
        realized_pnl: 0,
        created_at: timestamp,
      };

      // Update orders and trades
      setOrders((prev) => [newOrder, ...prev]);
      setTrades((prev) => [newTrade, ...prev]);

      // Update or create position
      setPositions((prevPositions) => {
        const existingPosition = prevPositions.find(
          (p) => p.symbol === orderRequest.symbol
        );
        const newPositions = [...prevPositions];

        if (existingPosition) {
          const isSameSide =
            ((existingPosition.side === "LONG" ||
              existingPosition.side === "Long") &&
              orderRequest.side === "BUY") ||
            ((existingPosition.side === "SHORT" ||
              existingPosition.side === "Short") &&
              orderRequest.side === "SELL");

          if (isSameSide) {
            // Increase position size
            const totalCost =
              existingPosition.size * existingPosition.entry_price +
              orderRequest.quantity * executionPrice;
            const newSize = existingPosition.size + orderRequest.quantity;
            const newEntryPrice = totalCost / newSize;

            const updatedPosition = {
              ...existingPosition,
              size: newSize,
              entry_price: newEntryPrice,
              margin: totalCost / orderRequest.leverage,
              updated_at: timestamp,
            };

            const index = newPositions.findIndex(
              (p) => p.id === existingPosition.id
            );
            newPositions[index] = updatedPosition;
          } else {
            // Reduce or close position
            if (orderRequest.quantity >= existingPosition.size) {
              // Close position entirely
              const realizedPnL =
                existingPosition.side === "LONG" ||
                existingPosition.side === "Long"
                  ? (executionPrice - existingPosition.entry_price) *
                    existingPosition.size
                  : (existingPosition.entry_price - executionPrice) *
                    existingPosition.size;

              // Update the trade record with realized PnL
              setTrades((prevTrades) =>
                prevTrades.map((trade) =>
                  trade.id === newTrade.id
                    ? { ...trade, realized_pnl: realizedPnL }
                    : trade
                )
              );

              // Remove position
              const index = newPositions.findIndex(
                (p) => p.id === existingPosition.id
              );
              newPositions.splice(index, 1);

              // Update account balance with realized PnL (let useEffect handle other calculations)
              setAccountSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      balance: prev.balance + realizedPnL - commission,
                    }
                  : prev
              );
            } else {
              // Partially close position
              const remainingSize =
                existingPosition.size - orderRequest.quantity;
              const partialRealizedPnL =
                existingPosition.side === "LONG" ||
                existingPosition.side === "Long"
                  ? (executionPrice - existingPosition.entry_price) *
                    orderRequest.quantity
                  : (existingPosition.entry_price - executionPrice) *
                    orderRequest.quantity;

              // Update the trade record with partial realized PnL
              setTrades((prevTrades) =>
                prevTrades.map((trade) =>
                  trade.id === newTrade.id
                    ? { ...trade, realized_pnl: partialRealizedPnL }
                    : trade
                )
              );

              const updatedPosition = {
                ...existingPosition,
                size: remainingSize,
                margin:
                  (remainingSize * existingPosition.entry_price) /
                  orderRequest.leverage,
                updated_at: timestamp,
              };

              const index = newPositions.findIndex(
                (p) => p.id === existingPosition.id
              );
              newPositions[index] = updatedPosition;

              // Update account balance with partial realized PnL (let useEffect handle other calculations)
              setAccountSummary((prev) =>
                prev
                  ? {
                      ...prev,
                      balance: prev.balance + partialRealizedPnL - commission,
                    }
                  : prev
              );
            }
          }
        } else {
          // Create new position
          const positionSide = orderRequest.side === "BUY" ? "Long" : "Short";
          const newPosition = {
            id: `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            user_id: user.id,
            symbol: orderRequest.symbol,
            side: positionSide,
            size: orderRequest.quantity,
            entry_price: executionPrice,
            mark_price: currentPrice,
            leverage: orderRequest.leverage,
            margin: marginRequired,
            unrealized_pnl: 0,
            liquidation_price:
              positionSide === "Long"
                ? executionPrice * (1 - 1 / orderRequest.leverage + 0.004)
                : executionPrice * (1 + 1 / orderRequest.leverage - 0.004),
            created_at: timestamp,
            updated_at: timestamp,
          };

          newPositions.push(newPosition);

          // Update account balance (only balance and commission, let useEffect handle margin calculations)
          setAccountSummary((prev) =>
            prev
              ? {
                  ...prev,
                  balance: prev.balance - commission,
                }
              : prev
          );
        }

        return newPositions;
      });

      return { success: true, order: newOrder, trade: newTrade };
    },
    [accountSummary, user]
  );

  // Create order
  const createOrder = async (orderRequest) => {
    if (!user) throw new Error("User not authenticated");

    try {
      // Don't set loading to prevent UI flicker during order execution
      setError(null);

      // Validate order request
      if (
        !orderRequest.symbol ||
        !orderRequest.side ||
        !orderRequest.type ||
        !orderRequest.quantity
      ) {
        throw new Error("Missing required order fields");
      }

      if (orderRequest.quantity <= 0) {
        throw new Error("Quantity must be positive");
      }

      if (orderRequest.type === "LIMIT" && !orderRequest.price) {
        throw new Error("Price is required for limit orders");
      }

      // Get current market price for market orders
      // Try both direct access and case-insensitive access
      let currentTicker = realTimeTickers
        ? realTimeTickers[orderRequest.symbol]
        : null;
      if (!currentTicker && realTimeTickers) {
        // Try case variations
        const upperSymbol = orderRequest.symbol.toUpperCase();
        const lowerSymbol = orderRequest.symbol.toLowerCase();
        currentTicker =
          realTimeTickers[upperSymbol] || realTimeTickers[lowerSymbol];

        // Try to find partial match
        if (!currentTicker) {
          const matchingKey = Object.keys(realTimeTickers).find(
            (key) => key.toUpperCase() === upperSymbol
          );
          if (matchingKey) {
            currentTicker = realTimeTickers[matchingKey];
          }
        }
      }

      const marketDataPrice = marketData.find(
        (m) => m.symbol === orderRequest.symbol
      )?.price;


      // Robust price detection with multiple attempts
      let currentPrice = 0;
      let priceSource = "none";

      // Method 1: Direct ticker access
      if (currentTicker?.price && currentTicker.price > 0) {
        currentPrice = parseFloat(currentTicker.price);
        priceSource = "realtime_ticker";
      }
      // Method 2: Try different price properties from ticker
      else if (currentTicker) {
        if (currentTicker.c && parseFloat(currentTicker.c) > 0) {
          currentPrice = parseFloat(currentTicker.c); // Binance uses 'c' for close price
          priceSource = "realtime_ticker_c";
        } else if (
          currentTicker.lastPrice &&
          parseFloat(currentTicker.lastPrice) > 0
        ) {
          currentPrice = parseFloat(currentTicker.lastPrice);
          priceSource = "realtime_ticker_lastPrice";
        }
      }
      // Method 3: Market data from context (this should have WebSocket prices)
      if (!currentPrice && marketDataPrice && marketDataPrice > 0) {
        currentPrice = parseFloat(marketDataPrice);
        priceSource = "market_data";
      }
      // Method 4: Try to get price from any ticker data available
      if (
        !currentPrice &&
        realTimeTickers &&
        Object.keys(realTimeTickers).length > 0
      ) {
        const symbolTicker = realTimeTickers[orderRequest.symbol];
        if (symbolTicker) {
          const tickerPrice =
            symbolTicker.price || symbolTicker.c || symbolTicker.lastPrice;
          if (tickerPrice && parseFloat(tickerPrice) > 0) {
            currentPrice = parseFloat(tickerPrice);
            priceSource = "realtime_fallback";
          }
        }
      }
      // Method 5: Try to get from global WebSocket service (if chart is using it)
      if (
        !currentPrice &&
        window.binanceWS &&
        typeof window.binanceWS.getTicker === "function"
      ) {
        try {
          const globalTicker = window.binanceWS.getTicker(orderRequest.symbol);
          if (
            globalTicker &&
            globalTicker.price &&
            parseFloat(globalTicker.price) > 0
          ) {
            currentPrice = parseFloat(globalTicker.price);
            priceSource = "global_websocket";
          }
        } catch (e) {
          // Silent fail
        }
      }
      // Method 6: Try alternative global approaches
      if (
        !currentPrice &&
        window.tradingViewWidget &&
        typeof window.tradingViewWidget.getPrice === "function"
      ) {
        try {
          const widgetPrice = window.tradingViewWidget.getPrice(
            orderRequest.symbol
          );
          if (widgetPrice && parseFloat(widgetPrice) > 0) {
            currentPrice = parseFloat(widgetPrice);
            priceSource = "trading_view";
          }
        } catch (e) {
          // Silent fail - this is just an attempt
        }
      }

      // Final fallback: Use realistic prices matching backend
      if (currentPrice === 0) {
        const fallbackPrices = {
          BTCUSDT: 65000, // Bitcoin
          ETHUSDT: 3500, // Ethereum
          XRPUSDT: 0.52, // XRP
          ADAUSDT: 0.45, // Cardano
          BNBUSDT: 600, // BNB
          DOTUSDT: 6.5, // Polkadot
          SOLUSDT: 150, // Solana
          SUIUSDT: 2.0, // SUI
          DOGEUSDT: 0.08, // Dogecoin
          LINKUSDT: 14.5, // Chainlink
          XLMUSDT: 0.12, // Stellar
          LTCUSDT: 70.0, // Litecoin
        };
        currentPrice = fallbackPrices[orderRequest.symbol] || 100;
        priceSource = "fallback_mock";
      }

      // Build complete order request with current market price
      const orderRequestWithMarketPrice = {
        ...orderRequest,
        current_price: currentPrice > 0 ? currentPrice : null, // Always send current price if available
      };

      // Remove price field for market orders (backend will use current_price)
      if (orderRequest.type === "MARKET") {
        // Don't send price field for market orders, let backend handle it
        delete orderRequestWithMarketPrice.price;
      }


      // Send order to backend
      const result = await tradingService.createOrder(
        orderRequestWithMarketPrice
      );


      // Optimized refresh - delay to prevent immediate re-render
      setTimeout(() => {
        Promise.all([
          tradingService.getAccountSummary().then(setAccountSummary),
          tradingService.getPositions().then(setPositions),
          tradingService.getOrders(20).then(setOrders),
          tradingService.getTrades(20).then(setTrades),
        ]).catch(() => {
          // Silent catch
        });
      }, 200); // Delay to prevent jarring refresh

      return result;
    } catch (err) {
      console.error("Failed to create order:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Close position
  const closePosition = useCallback(
    async (positionId) => {
      if (!user) throw new Error("User not authenticated");

      try {
        setError(null);

        // Close position via backend API
        const result = await tradingService.closePosition(positionId);

        // Optimized refresh - delay to prevent immediate re-render
        setTimeout(() => {
          Promise.all([
            tradingService.getAccountSummary().then(setAccountSummary),
            tradingService.getPositions().then(setPositions),
            tradingService.getOrders(20).then(setOrders),
            tradingService.getTrades(20).then(setTrades),
          ]).catch(() => {
            // Silent catch
          });
        }, 200);

        return result;
      } catch (err) {
        console.error("Failed to close position:", err);
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  // Process positions that need to be closed due to SL/TP triggers
  useEffect(() => {
    if (positionsToClose.length > 0) {
      const processCloseQueue = async () => {
        const toProcess = [...positionsToClose];
        setPositionsToClose([]); // Clear the queue immediately

        for (const item of toProcess) {
          try {
            await closePosition(item.positionId);
          } catch (error) {
            console.error(
              `Failed to close position ${item.positionId}:`,
              error
            );
          }
        }
      };

      // Small delay to ensure price updates are processed
      const timeoutId = setTimeout(processCloseQueue, 200);
      return () => clearTimeout(timeoutId);
    }
  }, [positionsToClose, closePosition]);

  // Set stop loss for position
  const setStopLoss = useCallback(
    async (positionId, stopPrice) => {
      if (!user) throw new Error("User not authenticated");

      try {
        setError(null);

        // Update stop loss via backend API
        const result = await tradingService.setStopLoss(positionId, stopPrice);

        // Optimized refresh - delay to prevent immediate re-render
        setTimeout(() => {
          tradingService.getPositions().then(setPositions).catch(console.error);
        }, 200);

        return result;
      } catch (err) {
        console.error("Failed to set stop loss:", err);
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  // Set take profit for position
  const setTakeProfit = useCallback(
    async (positionId, takeProfitPrice) => {
      if (!user) throw new Error("User not authenticated");

      try {
        setError(null);

        // Update take profit via backend API
        const result = await tradingService.setTakeProfit(
          positionId,
          takeProfitPrice
        );

        // Optimized refresh - delay to prevent immediate re-render
        setTimeout(() => {
          tradingService.getPositions().then(setPositions).catch(console.error);
        }, 200);

        return result;
      } catch (err) {
        console.error("Failed to set take profit:", err);
        setError(err.message);
        throw err;
      }
    },
    [user]
  );

  // Cancel order
  const cancelOrder = async (orderId) => {
    if (!user) throw new Error("User not authenticated");

    try {
      setError(null);

      // Cancel order via backend API
      const result = await tradingService.cancelOrder(orderId);

      // Optimized refresh - delay to prevent immediate re-render
      setTimeout(() => {
        tradingService.getOrders(20).then(setOrders).catch(console.error);
      }, 200);

      return result;
    } catch (err) {
      console.error("Failed to cancel order:", err);
      setError(err.message);
      throw err;
    }
  };

  // Reset account
  const resetAccount = async () => {
    if (!user) throw new Error("User not authenticated");

    try {
      setError(null);

      // Reset account via backend API
      const result = await tradingService.resetAccount();

      // Optimized refresh - delay to prevent immediate re-render
      setTimeout(() => {
        Promise.all([
          tradingService.getAccountSummary().then(setAccountSummary),
          tradingService.getPositions().then(setPositions),
          tradingService.getOrders(10).then(setOrders),
          tradingService.getTrades(10).then(setTrades),
        ]).catch((error) =>
          console.error("Failed to refresh after reset:", error)
        );
      }, 200);

      return result;
    } catch (err) {
      console.error("Failed to reset account:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to symbol updates
  const subscribeToSymbol = async (symbol) => {
    try {
      // await invoke('subscribe_to_symbol', { symbol })
      setSelectedSymbol(symbol);
    } catch (err) {
      console.error("Failed to subscribe to symbol:", err);
    }
  };

  // Data initialization is handled by API calls when user is authenticated

  useEffect(() => {
    if (user) {
      // Initial data fetch
      Promise.all([
        fetchAccountSummary(),
        fetchPositions(),
        fetchOrders(),
        fetchTrades(),
      ]);

      // Set up real-time data refresh for trading simulator
      const refreshInterval = setInterval(() => {
        // Only refresh if user is still authenticated
        if (!user || !authService.isAuthenticated()) {
          return;
        }

        // Refresh trading data every 5 seconds to reduce re-renders
        Promise.all([
          tradingService.getAccountSummary().then((backendAccount) => {
            // Only update balance from backend, keep real-time calculations for other fields
            setAccountSummary((prev) => {
              if (!prev) return backendAccount;
              return {
                ...prev,
                balance: backendAccount.balance, // Update balance from backend
                // Keep real-time calculated values for other fields
              };
            });
          }),
          tradingService.getPositions().then((backendPositions) => {
            // Merge backend positions with frontend real-time calculations
            setPositions((prevPositions) => {
              return backendPositions.map((backendPos) => {
                const frontendPos = prevPositions.find(
                  (p) => p.id === backendPos.id
                );
                if (frontendPos) {
                  // Always prioritize frontend real-time data for mark_price and unrealized_pnl
                  return {
                    ...backendPos,
                    mark_price: frontendPos.mark_price || backendPos.mark_price,
                    unrealized_pnl:
                      frontendPos.unrealized_pnl !== undefined
                        ? frontendPos.unrealized_pnl
                        : backendPos.unrealized_pnl,
                  };
                }
                return backendPos;
              });
            });
          }),
          tradingService.getOrders(20).then(setOrders),
          tradingService.getTrades(20).then(setTrades),
        ]).catch((error) =>
          console.error("Failed to refresh trading data:", error)
        );
      }, 5000);

      return () => clearInterval(refreshInterval);
    }
  }, [user?.id]);

  // Create stable actions object that doesn't change
  const stableActions = useRef({});

  // Update actions ref when user changes
  useEffect(() => {
    stableActions.current = {
      createOrder,
      cancelOrder,
      closePosition,
      setStopLoss,
      setTakeProfit,
      resetAccount,
      subscribeToSymbol,
      fetchAccountSummary,
      fetchPositions,
      fetchOrders,
      fetchTrades,
      setError,
    };
  }, [user?.id]);

  // Memoize context data with stable references
  const contextData = useMemo(
    () => ({
      accountSummary,
      positions,
      orders,
      trades,
      marketData,
      selectedSymbol,
      loading,
      error: error || wsError,
      connectionStatus,
      realTimeTickers,
      tickersLoading,
    }),
    [
      accountSummary,
      positions,
      orders,
      trades,
      marketData,
      selectedSymbol,
      loading,
      error,
      wsError,
      connectionStatus,
      realTimeTickers,
      tickersLoading,
    ]
  );

  // Combine data with stable actions
  const value = useMemo(
    () => ({
      ...contextData,
      ...(stableActions.current || {}),
    }),
    [contextData]
  );

  return (
    <TradingContext.Provider value={value}>{children}</TradingContext.Provider>
  );
}
