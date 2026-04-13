import { useTrading } from "../../contexts/TradingContext";
import { formatPriceBySymbol, formatVolume } from "../../utils/formatters";

export default function MarketData() {
  const {
    marketData,
    selectedSymbol,
    subscribeToSymbol,
    connectionStatus,
    tickersLoading,
  } = useTrading();

  return (
    <div className="cyber-panel p-3">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold neon-text terminal-text">
          ⚡ MARKET DATA ⚡
        </h3>
        <div className="flex items-center space-x-2">
          <div
            className={`w-2 h-2 rounded-full ${
              connectionStatus.connected
                ? "bg-neon-green shadow-neon-green"
                : "bg-neon-green shadow-neon-pink"
            } animate-pulse`}
          ></div>
          <span
            className={`text-xs terminal-text ${
              connectionStatus.connected
                ? "neon-text status-online"
                : "neon-text-green status-online"
            }`}
          >
            [{connectionStatus.connected ? "LIVE" : "ONLINE"}]
          </span>
          {tickersLoading && (
            <span className="text-xs neon-text-yellow terminal-text animate-pulse">
              [LOADING...]
            </span>
          )}
        </div>
      </div>

      {/* Cyberpunk ticker layout */}
      <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide pb-2">
        {marketData.map((ticker) => (
          <div
            key={ticker.symbol}
            onClick={() => subscribeToSymbol(ticker.symbol)}
            className={`flex-shrink-0 min-w-[110px] max-w-[110px] p-1.5 border rounded cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-neon-green ${
              selectedSymbol === ticker.symbol
                ? "border-neon-cyan bg-neon-cyan bg-opacity-10 shadow-neon-cyan"
                : "border-neon-green border-opacity-50 hover:border-neon-green hover:bg-neon-green hover:bg-opacity-5"
            }`}
          >
            {/* Symbol and change in header */}
            <div className="flex items-center justify-between mb-0.5">
              <h4 className="font-medium text-[10px] truncate neon-text terminal-text">
                {ticker.symbol.replace("USDT", "")}
              </h4>
              <div
                className={`text-[9px] px-0.5 py-0.5 rounded border ${
                  ticker.price_change_24h >= 0
                    ? "text-neon-green border-neon-green bg-neon-green bg-opacity-10"
                    : "text-neon-pink border-neon-pink bg-neon-pink bg-opacity-10"
                }`}
              >
                {ticker.price_change_24h >= 0 ? "+" : ""}
                {ticker.price_change_24h.toFixed(1)}%
              </div>
            </div>

            {/* Price - main focus */}
            <div className="text-center mb-0.5 overflow-hidden">
              <div className="neon-text-cyan font-bold text-[10px] terminal-text break-words leading-tight">
                ${formatPriceBySymbol(ticker.price, ticker.symbol)}
              </div>
            </div>

            {/* Compact H/L in two lines for better readability */}
            <div className="text-[9px] mb-0.5 space-y-0.5">
              <div className="flex justify-between overflow-hidden">
                <span className="text-neon-green terminal-text text-[8px]">
                  H:
                </span>
                <span className="text-neon-green terminal-text text-[8px] truncate ml-1">
                  {formatPriceBySymbol(ticker.high_24h, ticker.symbol)}
                </span>
              </div>
              <div className="flex justify-between overflow-hidden">
                <span className="text-neon-pink terminal-text text-[8px]">
                  L:
                </span>
                <span className="text-neon-pink terminal-text text-[8px] truncate ml-1">
                  {formatPriceBySymbol(ticker.low_24h, ticker.symbol)}
                </span>
              </div>
            </div>

            {/* Volume */}
            <div className="text-center text-[9px] neon-text terminal-text opacity-70">
              VOL: {formatVolume(ticker.volume_24h)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
