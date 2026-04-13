import { useState, useEffect, useRef } from "react";

export default function TechnicalAnalysis() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  const [selectedInterval, setSelectedInterval] = useState("15m");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);

  // Popular cryptocurrency symbols
  const cryptoSymbols = [
    { value: "BTCUSDT", label: "Bitcoin (BTC/USDT)" },
    { value: "ETHUSDT", label: "Ethereum (ETH/USDT)" },
    { value: "BNBUSDT", label: "BNB (BNB/USDT)" },
    { value: "ADAUSDT", label: "Cardano (ADA/USDT)" },
    { value: "SOLUSDT", label: "Solana (SOL/USDT)" },
    { value: "XRPUSDT", label: "XRP (XRP/USDT)" },
    { value: "DOTUSDT", label: "Polkadot (DOT/USDT)" },
    { value: "DOGEUSDT", label: "Dogecoin (DOGE/USDT)" },
    { value: "AVAXUSDT", label: "Avalanche (AVAX/USDT)" },
    { value: "MATICUSDT", label: "Polygon (MATIC/USDT)" },
  ];

  // Timeframe intervals
  const intervals = [
    { value: "1m", label: "1 Minute" },
    { value: "5m", label: "5 Minutes" },
    { value: "15m", label: "15 Minutes" },
    { value: "30m", label: "30 Minutes" },
    { value: "1h", label: "1 Hour" },
    { value: "4h", label: "4 Hours" },
    { value: "1D", label: "1 Day" },
    { value: "1W", label: "1 Week" },
  ];

  // Create TradingView Technical Indicators widget
  const createWidget = () => {
    if (!containerRef.current) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Clear previous widget
      containerRef.current.innerHTML = "";

      // Create widget container (same approach as Economic Calendar)
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "400px";
      widgetContainer.style.width = "100%";

      // Create widget content div
      const widgetContent = document.createElement("div");
      widgetContent.className = "tradingview-widget-container__widget";
      widgetContent.style.height = "calc(400px - 32px)";
      widgetContent.style.width = "100%";

      // Create copyright div
      const copyrightDiv = document.createElement("div");
      copyrightDiv.className = "tradingview-widget-copyright";
      copyrightDiv.innerHTML =
        '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

      // Create script element
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js";
      script.async = true;

      // Widget configuration
      const config = {
        interval: selectedInterval,
        width: "100%",
        isTransparent: false,
        height: "400",
        symbol: `BINANCE:${selectedSymbol}`,
        showIntervalTabs: true,
        locale: "en",
        colorTheme: "dark",
      };

      script.innerHTML = JSON.stringify(config);

      // Append elements
      widgetContainer.appendChild(widgetContent);
      widgetContainer.appendChild(copyrightDiv);
      widgetContainer.appendChild(script);
      containerRef.current.appendChild(widgetContainer);

      setTimeout(() => {
        setLoading(false);
      }, 2000);
    } catch (err) {
      console.error("Error creating TradingView widget:", err);
      setError("Failed to create TradingView widget");
      setLoading(false);
      showFallbackContent();
    }
  };

  // Show fallback content when widget fails
  const showFallbackContent = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="flex items-center justify-center h-[400px] bg-gray-800 rounded border border-gray-600">
          <div class="text-center text-gray-400">
            <div class="text-4xl mb-4">📊</div>
            <h3 class="text-lg font-medium mb-2">Technical Indicators Unavailable</h3>
            <p class="text-sm mb-4">Unable to load TradingView widget for ${selectedSymbol}</p>
            <div class="space-y-2 text-xs">
              <div>• Check your internet connection</div>
              <div>• Try selecting a different cryptocurrency</div>
              <div>• Refresh the page if the issue persists</div>
            </div>
          </div>
        </div>
      `;
    }
  };

  // Create widget when component mounts or symbol/interval changes
  useEffect(() => {
    const timer = setTimeout(createWidget, 100);
    return () => clearTimeout(timer);
  }, [selectedSymbol, selectedInterval]);

  const handleSymbolChange = (symbol) => {
    setSelectedSymbol(symbol);
  };

  const handleIntervalChange = (interval) => {
    setSelectedInterval(interval);
  };

  const handleRefresh = () => {
    createWidget();
  };

  return (
    <div className="cyber-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold neon-text-cyan terminal-text">
          Technical Indicators
        </h2>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs cyber-button px-2 py-1 disabled:opacity-50"
          title="Refresh widget"
        >
          �
        </button>
      </div>

      {/* Controls */}
      <div className="mb-4 space-y-3">
        {/* Symbol Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cryptocurrency
          </label>
          <select
            value={selectedSymbol}
            onChange={(e) => handleSymbolChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
          >
            {cryptoSymbols.map((crypto) => (
              <option key={crypto.value} value={crypto.value}>
                {crypto.label}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timeframe
          </label>
          <div className="flex flex-wrap gap-2">
            {intervals.map((interval) => (
              <button
                key={interval.value}
                onClick={() => handleIntervalChange(interval.value)}
                className={`px-3 py-1 text-xs rounded border transition-colors ${
                  selectedInterval === interval.value
                    ? "bg-neon-cyan bg-opacity-20 border-neon-cyan text-neon-cyan"
                    : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                }`}
              >
                {interval.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm">
          {error}
          <button
            onClick={handleRefresh}
            className="ml-2 underline hover:no-underline"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Widget Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 rounded z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mx-auto mb-2"></div>
              <div className="text-sm text-gray-400">
                Loading Technical Indicators...
              </div>
            </div>
          </div>
        )}

        <div
          ref={containerRef}
          className="min-h-[400px] bg-gray-800 rounded border border-gray-600"
        >
          <div className="flex items-center justify-center h-[400px]">
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-gray-400">Loading Technical Indicators...</p>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded text-xs text-gray-400">
        <div className="font-medium text-neon-cyan mb-1">
          About Technical Indicators
        </div>
        <div>
          Technical indicators widget shows buy/sell/neutral signals based on
          moving averages, oscillators, and other technical analysis tools. The
          gauge displays the overall market sentiment with signal counts for
          better decision making.
        </div>
      </div>
    </div>
  );
}
