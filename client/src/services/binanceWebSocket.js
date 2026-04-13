class BinanceWebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.subscriptions = new Map();
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.pingInterval = null;
    // Use Binance combined streams for multiple subscriptions
    this.baseURL = "wss://stream.binance.com:9443/stream";
    this.useStream = true; // Use stream format

    // Order book management
    this.orderBooks = new Map();
    this.orderBookSequences = new Map();

    // Price data
    this.latestPrices = new Map();
    this.tickers = new Map();

    // Kline data
    this.klineData = new Map();
  }

  connect() {
    if (this.ws && this.isConnected) {
      return Promise.resolve();
    }

    if (this.isConnecting) {
      return new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnected) {
            resolve();
          } else if (!this.isConnecting) {
            reject(new Error("Connection failed"));
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });
    }

    return new Promise((resolve, reject) => {
      try {
        this.isConnecting = true;

        // For initial connection, use basic stream URL
        // We'll add streams via URL parameters when we have subscriptions
        const defaultStreams = [
          "btcusdt@ticker",
          "ethusdt@ticker",
          "adausdt@ticker",
          "bnbusdt@ticker",
          "dotusdt@ticker",
          "xrpusdt@ticker",
          "solusdt@ticker",
          "suiusdt@ticker",
          "dogeusdt@ticker",
          "linkusdt@ticker",
          "xlmusdt@ticker",
          "ltcusdt@ticker",
        ];
        const connectURL =
          this.subscriptions.size > 0
            ? `${this.baseURL}?streams=${Array.from(
                this.subscriptions.keys()
              ).join("/")}`
            : `${this.baseURL}?streams=${defaultStreams.join("/")}`;

        this.ws = new WebSocket(connectURL);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startPing();

          // Wait longer before re-subscribing to ensure connection is fully stable
          setTimeout(() => {
            this.resubscribeAll();
          }, 1000);

          this.emit("connected");
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            // Handle ping frames from server
            if (event.data === "ping") {
              this.ws.send("pong");
              return;
            }

            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this.isConnecting = false;
          this.stopPing();
          this.emit("disconnected");

          // Attempt to reconnect
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          } else {
            console.error("Max reconnection attempts reached");
            this.emit("error", new Error("Max reconnection attempts reached"));
          }
        };

        this.ws.onerror = (error) => {
          console.error("Binance WebSocket error:", error);
          this.isConnecting = false;
          this.emit("error", error);
          reject(error);
        };
      } catch (error) {
        console.error("Error creating WebSocket connection:", error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.stopPing();
    this.subscriptions.clear();
  }

  scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);


    setTimeout(() => {
      if (!this.isConnected) {
        this.connect();
      }
    }, delay);
  }

  resubscribeAll() {
    if (this.subscriptions.size > 0) {
      const streams = Array.from(this.subscriptions.keys());

      // Clear existing subscriptions to allow fresh subscription
      const storedStreams = [...streams];
      this.subscriptions.clear();

      // Delay resubscription to ensure connection is stable
      setTimeout(() => {
        this.subscribeToStreams(storedStreams);
      }, 500);
    }
  }

  startPing() {
    // According to Binance Futures docs, server sends ping every 3 minutes
    // We must respond with pong within 10 minutes or connection will be dropped
    // We'll also send our own keepalive pings every 5 minutes
    this.pingInterval = setInterval(() => {
      if (
        this.isConnected &&
        this.ws &&
        this.ws.readyState === WebSocket.OPEN
      ) {
        // Send empty message as keepalive (allowed by Binance Futures)
        try {
          this.ws.send("");
        } catch (error) {
          console.error("Error sending keepalive ping:", error);
        }
      }
    }, 300000); // Keepalive every 5 minutes
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  subscribeToStreams(streams) {
    if (
      !this.isConnected ||
      !this.ws ||
      this.ws.readyState !== WebSocket.OPEN
    ) {
      streams.forEach((stream) => this.subscriptions.set(stream, true));
      return;
    }

    // Filter out already subscribed streams to prevent duplicate subscriptions
    const newStreams = streams.filter(
      (stream) => !this.subscriptions.has(stream)
    );

    if (newStreams.length === 0) {
      return;
    }

    // Store subscriptions first to prevent duplicate calls
    newStreams.forEach((stream) => this.subscriptions.set(stream, true));

    // Use subscription method for Binance Futures API
    const subscribeMessage = {
      method: "SUBSCRIBE",
      params: newStreams,
      id: Date.now(),
    };

    try {
      this.ws.send(JSON.stringify(subscribeMessage));
    } catch (error) {
      // Remove from subscriptions if failed to send
      newStreams.forEach((stream) => this.subscriptions.delete(stream));
    }
  }

  unsubscribeFromStreams(streams) {
    if (!this.isConnected || !this.ws) {
      streams.forEach((stream) => this.subscriptions.delete(stream));
      return;
    }

    const unsubscribeMessage = {
      method: "UNSUBSCRIBE",
      params: streams,
      id: Date.now(),
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));

    // Remove subscriptions
    streams.forEach((stream) => this.subscriptions.delete(stream));
  }

  // Subscribe to specific data types
  subscribeToPrices(symbols) {
    const streams = symbols.map((symbol) => `${symbol.toLowerCase()}@ticker`);
    this.subscribeToStreams(streams);
  }

  subscribeToOrderBook(symbols, levels = "20") {
    const streams = symbols.map(
      (symbol) => `${symbol.toLowerCase()}@depth${levels}@100ms`
    );
    this.subscribeToStreams(streams);
  }

  subscribeToKlines(symbols, interval = "1m") {
    const streams = symbols.map(
      (symbol) => `${symbol.toLowerCase()}@kline_${interval}`
    );
    this.subscribeToStreams(streams);
  }

  subscribeToMarkPrice(symbols) {
    const streams = symbols.map(
      (symbol) => `${symbol.toLowerCase()}@markPrice@1s`
    );
    this.subscribeToStreams(streams);
  }

  handleMessage(data) {
    // Handle subscription confirmation
    if (data.result === null && data.id) {
      return;
    }

    // Handle pong response
    if (data.result === "pong") {
      return;
    }

    // Handle stream data (combined stream format)
    if (data.stream) {
      const [symbol, streamType] = this.parseStreamName(data.stream);

      switch (true) {
        case streamType.includes("ticker"):
          this.handleTickerData(symbol, data.data);
          break;
        case streamType.includes("depth"):
          this.handleOrderBookData(symbol, data.data);
          break;
        case streamType.includes("kline"):
          this.handleKlineData(symbol, data.data);
          break;
        case streamType.includes("markPrice"):
          this.handleMarkPriceData(symbol, data.data);
          break;
        default:
      }
    } else if (data.lastUpdateId && (data.bids || data.asks)) {
      // Handle direct order book data (single stream format)
      this.handleOrderBookData("BTCUSDT", data);
    } else if (data.c && data.h && data.l) {
      // Handle direct ticker data (single stream format)
      this.handleTickerData("BTCUSDT", data);
    }
  }

  parseStreamName(streamName) {
    const parts = streamName.split("@");
    return [parts[0].toUpperCase(), parts.slice(1).join("@")];
  }

  handleTickerData(symbol, data) {
    const ticker = {
      symbol,
      price: parseFloat(data.c),
      priceChange: parseFloat(data.P),
      priceChangePercent: parseFloat(data.P),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      volume: parseFloat(data.v),
      quoteVolume: parseFloat(data.q),
      openTime: data.O,
      closeTime: data.C,
      timestamp: Date.now(),
    };

    this.latestPrices.set(symbol, ticker.price);
    this.tickers.set(symbol, ticker);
    this.emit("ticker", { symbol, ticker });
    this.emit(`ticker:${symbol}`, ticker);
  }

  handleOrderBookData(symbol, data) {
    try {
      // Handle different data formats (stream vs direct)
      const bids = data.b || data.bids || [];
      const asks = data.a || data.asks || [];

      if (!Array.isArray(bids) || !Array.isArray(asks)) {
        console.warn("Invalid order book data format:", data);
        return;
      }

      const orderBook = {
        symbol,
        bids: bids.map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty),
        })),
        asks: asks.map(([price, qty]) => ({
          price: parseFloat(price),
          quantity: parseFloat(qty),
        })),
        updateId: data.u || data.lastUpdateId,
        timestamp: Date.now(),
      };

      this.orderBooks.set(symbol, orderBook);

      this.emit("orderBook", { symbol, orderBook });
      this.emit(`orderBook:${symbol}`, orderBook);
    } catch (error) {
      console.error("Error handling order book data:", error, "Data:", data);
    }
  }

  handleKlineData(symbol, data) {
    const kline = {
      symbol,
      openTime: data.k.t,
      closeTime: data.k.T,
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v),
      quoteVolume: parseFloat(data.k.q),
      interval: data.k.i,
      isClosed: data.k.x,
      timestamp: Date.now(),
    };

    // Store kline data
    if (!this.klineData.has(symbol)) {
      this.klineData.set(symbol, new Map());
    }

    const symbolKlines = this.klineData.get(symbol);
    if (!symbolKlines.has(kline.interval)) {
      symbolKlines.set(kline.interval, []);
    }

    const intervalKlines = symbolKlines.get(kline.interval);

    // Update or add kline
    const existingIndex = intervalKlines.findIndex(
      (k) => k.openTime === kline.openTime
    );
    if (existingIndex >= 0) {
      intervalKlines[existingIndex] = kline;
    } else {
      intervalKlines.push(kline);
      // Keep only last 1000 klines
      if (intervalKlines.length > 1000) {
        intervalKlines.shift();
      }
    }

    this.emit("kline", { symbol, kline });
    this.emit(`kline:${symbol}`, kline);
    this.emit(`kline:${symbol}:${kline.interval}`, kline);
  }

  handleMarkPriceData(symbol, data) {
    const markPrice = {
      symbol,
      markPrice: parseFloat(data.p),
      indexPrice: parseFloat(data.i),
      estimatedSettlePrice: parseFloat(data.P),
      fundingRate: parseFloat(data.r),
      nextFundingTime: data.T,
      timestamp: Date.now(),
    };

    this.emit("markPrice", { symbol, markPrice });
    this.emit(`markPrice:${symbol}`, markPrice);
  }

  // Event system
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getLatestPrice(symbol) {
    return this.latestPrices.get(symbol);
  }

  getTicker(symbol) {
    return this.tickers.get(symbol);
  }

  getOrderBook(symbol) {
    return this.orderBooks.get(symbol);
  }

  getKlineData(symbol, interval = "1m") {
    const symbolKlines = this.klineData.get(symbol);
    return symbolKlines ? symbolKlines.get(interval) || [] : [];
  }

  getAllTickers() {
    return Object.fromEntries(this.tickers);
  }

  getAllPrices() {
    return Object.fromEntries(this.latestPrices);
  }

  isSymbolSubscribed(symbol, streamType = "ticker") {
    const streamName = `${symbol.toLowerCase()}@${streamType}`;
    return this.subscriptions.has(streamName);
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      subscriptions: this.subscriptions.size,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

// Create singleton instance
const binanceWS = new BinanceWebSocketService();

// Make it globally accessible for debugging and order creation
if (typeof window !== 'undefined') {
  window.binanceWS = binanceWS;
}

export default binanceWS;
