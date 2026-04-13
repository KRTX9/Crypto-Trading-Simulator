import { useEffect, useRef, useState, useCallback, memo, useMemo } from "react";
import { useTrading } from "../../contexts/TradingContext";
import binanceWS from "../../services/binanceWebSocket";
import ErrorBoundary from "../ui/ErrorBoundary";

// Indicator types
const INDICATORS = {
  MA: {
    name: "MA",
    periods: [7, 25, 99],
    colors: ["#f7931a", "#2962ff", "#e91e63"],
  },
  EMA: { name: "EMA", periods: [9, 200], colors: ["#00bcd4", "#ff9800"] },
  BOLL: { name: "BOLL", period: 20, stdDev: 2, color: "#9c27b0" },
  VOLUME: { name: "Volume", color: "#26a69a" },
};

// Indicators Panel
const IndicatorsPanel = memo(function IndicatorsPanel({
  activeIndicators,
  onToggleIndicator,
}) {
  const indicators = [
    { id: "MA", label: "MA (7,25,99)", color: "#f7931a" },
    { id: "EMA", label: "EMA (9,200)", color: "#00bcd4" },
    { id: "BOLL", label: "Bollinger", color: "#9c27b0" },
    { id: "VOL", label: "Volume", color: "#26a69a" },
  ];

  return (
    <div className="flex items-center gap-1">
      {indicators.map((ind) => (
        <button
          key={ind.id}
          onClick={() => onToggleIndicator(ind.id)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeIndicators.includes(ind.id)
              ? "text-white"
              : "text-gray-500 hover:text-gray-300"
          }`}
          style={{
            backgroundColor: activeIndicators.includes(ind.id)
              ? ind.color + "40"
              : "transparent",
            borderColor: activeIndicators.includes(ind.id)
              ? ind.color
              : "transparent",
            borderWidth: 1,
          }}
        >
          {ind.label}
        </button>
      ))}
    </div>
  );
});

// Draggable Position Line Component
const DraggableLine = memo(function DraggableLine({
  type,
  price,
  label,
  color,
  bgColor,
  formatPrice,
  onDrag,
  onDragEnd,
  isDraggable = false,
  chartHeight,
  priceToY,
  entryPrice,
  size,
  isLong,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [tempPrice, setTempPrice] = useState(null);
  const lineRef = useRef(null);

  const displayPrice = tempPrice !== null ? tempPrice : price;
  const y = priceToY(displayPrice);

  const expectedPnL = useMemo(() => {
    if (!isDragging || tempPrice === null || !entryPrice || !size) return null;
    const pnl = isLong
      ? (tempPrice - entryPrice) * size
      : (entryPrice - tempPrice) * size;
    const percentage = entryPrice > 0 ? (pnl / (entryPrice * size)) * 100 : 0;
    return { pnl, percentage };
  }, [isDragging, tempPrice, entryPrice, size, isLong]);

  const handleMouseDown = useCallback(
    (e) => {
      if (!isDraggable) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    },
    [isDraggable]
  );

  useEffect(() => {
    if (!isDragging) return;
    const handleMouseMove = (e) => {
      if (lineRef.current) {
        const container = lineRef.current.closest(".chart-overlay-container");
        if (container) {
          const rect = container.getBoundingClientRect();
          const mouseY = e.clientY - rect.top;
          const newPrice = onDrag?.(mouseY);
          if (newPrice !== null && newPrice !== undefined)
            setTempPrice(newPrice);
        }
      }
    };
    const handleMouseUp = () => {
      if (tempPrice !== null) onDragEnd?.(tempPrice);
      setTempPrice(null);
      setIsDragging(false);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, tempPrice, onDrag, onDragEnd]);

  if (y === null || y < 0 || y > chartHeight) return null;

  return (
    <div
      ref={lineRef}
      className="absolute left-0 right-0 flex items-center"
      style={{
        top: `${y}px`,
        transform: "translateY(-50%)",
        zIndex: isDragging ? 100 : type === "entry" ? 30 : 20,
      }}
    >
      <div
        className="flex-1 h-[2px]"
        style={{
          background: `repeating-linear-gradient(90deg, ${color} 0, ${color} 8px, transparent 8px, transparent 12px)`,
          opacity: type === "entry" ? 1 : 0.8,
        }}
      />
      <div
        className={`flex items-center text-white text-xs select-none ${
          isDraggable ? "cursor-ns-resize" : ""
        }`}
        onMouseDown={handleMouseDown}
        style={{ pointerEvents: "auto" }}
      >
        <div
          className="px-2 py-1 rounded-l flex items-center gap-1"
          style={{ backgroundColor: bgColor }}
        >
          {isDraggable && <span className="text-[10px] opacity-70">⋮⋮</span>}
          <span className="font-semibold">{label}</span>
        </div>
        <div
          className="px-2 py-1 rounded-r font-mono"
          style={{ backgroundColor: color }}
        >
          {formatPrice(displayPrice)}
        </div>
      </div>
      {isDragging && expectedPnL && (
        <div
          className={`absolute -top-8 right-0 text-white text-[11px] px-2 py-1 rounded shadow-lg ${
            type === "tp" ? "bg-green-700" : "bg-red-700"
          }`}
        >
          <span className="font-semibold">
            {type === "tp" ? "Expected Profit: " : "Expected Loss: "}
          </span>
          <span className="font-mono">
            {expectedPnL.pnl >= 0 ? "+" : ""}${expectedPnL.pnl.toFixed(2)}
          </span>
          <span className="ml-1 opacity-80">
            ({expectedPnL.percentage >= 0 ? "+" : ""}
            {expectedPnL.percentage.toFixed(2)}%)
          </span>
        </div>
      )}
    </div>
  );
});

// Fullscreen Overlay Component
const FullscreenOverlay = memo(function FullscreenOverlay({
  isOpen,
  onClose,
  children,
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#131722]">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
        title="Exit Fullscreen (Esc)"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
      {children}
    </div>
  );
});

// Fetch historical klines from Binance
async function fetchKlines(symbol, interval = "5m", limit = 500) {
  try {
    const response = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
    );
    const data = await response.json();
    return data.map((k) => ({
      time: k[0] / 1000,
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  } catch (error) {
    console.error("Failed to fetch klines:", error);
    return [];
  }
}

// Calculate Moving Average
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      result.push({ time: data[i].time, value: sum / period });
    }
  }
  return result.filter((d) => d.value !== null);
}

// Calculate EMA
function calculateEMA(data, period) {
  const result = [];
  const multiplier = 2 / (period + 1);
  let ema = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[i - j].close;
      ema = sum / period;
      result.push({ time: data[i].time, value: ema });
    } else {
      ema = (data[i].close - ema) * multiplier + ema;
      result.push({ time: data[i].time, value: ema });
    }
  }
  return result.filter((d) => d.value !== null);
}

// Calculate Bollinger Bands
function calculateBollinger(data, period = 20, stdDev = 2) {
  const upper = [],
    middle = [],
    lower = [];

  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) sum += data[i - j].close;
    const ma = sum / period;

    let variance = 0;
    for (let j = 0; j < period; j++)
      variance += Math.pow(data[i - j].close - ma, 2);
    const std = Math.sqrt(variance / period);

    middle.push({ time: data[i].time, value: ma });
    upper.push({ time: data[i].time, value: ma + stdDev * std });
    lower.push({ time: data[i].time, value: ma - stdDev * std });
  }
  return { upper, middle, lower };
}

// Main Chart Component
const ChartComponent = memo(function ChartComponent({ isFullscreen = false }) {
  const {
    selectedSymbol,
    setSelectedSymbol,
    positions,
    setStopLoss,
    setTakeProfit,
    closePosition,
    realTimeTickers,
  } = useTrading();

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const indicatorSeriesRef = useRef({});
  const [chartInterval, setChartInterval] = useState("15m");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [chartReady, setChartReady] = useState(false);
  const [chartHeight, setChartHeight] = useState(0);
  const [priceCoordVersion, setPriceCoordVersion] = useState(0);
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState([]);
  const [klineData, setKlineData] = useState([]);
  const currentSymbolRef = useRef(selectedSymbol);

  const currentPosition = positions.find((p) => p.symbol === selectedSymbol);

  const formatPrice = useCallback(
    (price) => {
      if (!price) return "0.00";
      const numPrice = parseFloat(price);
      if (selectedSymbol.includes("BTC")) return numPrice.toFixed(2);
      if (selectedSymbol.includes("ETH") || selectedSymbol.includes("BNB"))
        return numPrice.toFixed(2);
      if (numPrice < 1) return numPrice.toFixed(4);
      if (numPrice < 100) return numPrice.toFixed(3);
      return numPrice.toFixed(2);
    },
    [selectedSymbol]
  );

  const calculatePnL = useCallback((position, price) => {
    if (!position || !price) return 0;
    const entryPrice = parseFloat(position.entry_price);
    const size = parseFloat(position.size);
    const currPrice = parseFloat(price);
    const isLong = position.side === "LONG" || position.side === "Long";
    return isLong
      ? (currPrice - entryPrice) * size
      : (entryPrice - currPrice) * size;
  }, []);

  // Toggle indicator
  const handleToggleIndicator = useCallback((indicatorId) => {
    setActiveIndicators((prev) =>
      prev.includes(indicatorId)
        ? prev.filter((id) => id !== indicatorId)
        : [...prev, indicatorId]
    );
  }, []);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    let chart = null;
    let candleSeries = null;
    let isDestroyed = false;

    const initChart = async () => {
      try {
        const lc = await import("lightweight-charts");
        if (isDestroyed || !chartContainerRef.current) return;

        chart = lc.createChart(chartContainerRef.current, {
          layout: {
            background: { type: "solid", color: "#131722" },
            textColor: "#d1d4dc",
          },
          grid: {
            vertLines: { color: "#1e222d" },
            horzLines: { color: "#1e222d" },
          },
          crosshair: {
            mode: lc.CrosshairMode.Normal,
            vertLine: { color: "#505050", labelBackgroundColor: "#505050" },
            horzLine: { color: "#505050", labelBackgroundColor: "#505050" },
          },
          rightPriceScale: {
            borderColor: "#2B2B43",
            scaleMargins: { top: 0.1, bottom: 0.2 },
          },
          timeScale: {
            borderColor: "#2B2B43",
            timeVisible: true,
            secondsVisible: false,
          },
        });

        if (typeof chart.addSeries === "function" && lc.CandlestickSeries) {
          candleSeries = chart.addSeries(lc.CandlestickSeries, {
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderDownColor: "#ef5350",
            borderUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            wickUpColor: "#26a69a",
          });
        } else if (typeof chart.addCandlestickSeries === "function") {
          candleSeries = chart.addCandlestickSeries({
            upColor: "#26a69a",
            downColor: "#ef5350",
            borderDownColor: "#ef5350",
            borderUpColor: "#26a69a",
            wickDownColor: "#ef5350",
            wickUpColor: "#26a69a",
          });
        }

        if (!candleSeries) {
          console.error("Failed to create candle series");
          return;
        }

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;

        const handleResize = () => {
          if (chartContainerRef.current && chart && !isDestroyed) {
            const width = chartContainerRef.current.clientWidth;
            const height = chartContainerRef.current.clientHeight;
            chart.applyOptions({ width, height });
            setChartHeight(height);
          }
        };

        chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
          setPriceCoordVersion((v) => v + 1);
        });
        window.addEventListener("resize", handleResize);
        handleResize();
        setChartReady(true);

        return () => {
          window.removeEventListener("resize", handleResize);
        };
      } catch (err) {
        console.error("Chart init error:", err);
      }
    };

    initChart();

    return () => {
      isDestroyed = true;
      setChartReady(false);
      if (chart) {
        try {
          chart.remove();
        } catch (e) {}
      }
      chartRef.current = null;
      candleSeriesRef.current = null;
      indicatorSeriesRef.current = {};
    };
  }, [isFullscreen]);

  // Load historical data when symbol or interval changes
  useEffect(() => {
    if (!chartReady || !candleSeriesRef.current || !chartRef.current) return;
    currentSymbolRef.current = selectedSymbol;

    const loadData = async () => {
      setIsLoading(true);
      try {
        candleSeriesRef.current.setData([]);
        const klines = await fetchKlines(selectedSymbol, chartInterval);
        if (currentSymbolRef.current !== selectedSymbol) return;

        if (candleSeriesRef.current && klines.length > 0) {
          candleSeriesRef.current.setData(klines);
          setKlineData(klines);
          setCurrentPrice(klines[klines.length - 1].close);
          if (chartRef.current) {
            chartRef.current.timeScale().fitContent();
            chartRef.current
              .priceScale("right")
              .applyOptions({ autoScale: true });
          }
        }
      } catch (err) {
        console.error("Failed to load klines:", err);
      }
      setIsLoading(false);
    };

    loadData();
  }, [selectedSymbol, chartInterval, chartReady]);

  // Update indicators when data or active indicators change
  useEffect(() => {
    if (!chartReady || !chartRef.current || klineData.length === 0) return;

    let isCancelled = false;

    const updateIndicators = async () => {
      const lc = await import("lightweight-charts");
      if (isCancelled || !chartRef.current) return;

      // Remove old indicator series
      Object.values(indicatorSeriesRef.current).forEach((series) => {
        try {
          chartRef.current.removeSeries(series);
        } catch (e) {}
      });
      indicatorSeriesRef.current = {};

      // Add MA indicators
      if (activeIndicators.includes("MA")) {
        [7, 25, 99].forEach((period, idx) => {
          const maData = calculateMA(klineData, period);
          let series;
          if (
            typeof chartRef.current.addSeries === "function" &&
            lc.LineSeries
          ) {
            series = chartRef.current.addSeries(lc.LineSeries, {
              color: INDICATORS.MA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
            });
          } else {
            series = chartRef.current.addLineSeries({
              color: INDICATORS.MA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
            });
          }
          series.setData(maData);
          indicatorSeriesRef.current[`MA${period}`] = series;
        });
      }

      // Add EMA indicators
      if (activeIndicators.includes("EMA")) {
        [9, 200].forEach((period, idx) => {
          const emaData = calculateEMA(klineData, period);
          let series;
          if (
            typeof chartRef.current.addSeries === "function" &&
            lc.LineSeries
          ) {
            series = chartRef.current.addSeries(lc.LineSeries, {
              color: INDICATORS.EMA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
            });
          } else {
            series = chartRef.current.addLineSeries({
              color: INDICATORS.EMA.colors[idx],
              lineWidth: 1,
              priceLineVisible: false,
            });
          }
          series.setData(emaData);
          indicatorSeriesRef.current[`EMA${period}`] = series;
        });
      }

      // Add Bollinger Bands
      if (activeIndicators.includes("BOLL")) {
        const boll = calculateBollinger(klineData);
        ["upper", "middle", "lower"].forEach((band, idx) => {
          let series;
          const color = idx === 1 ? "#9c27b0" : "#9c27b080";
          if (
            typeof chartRef.current.addSeries === "function" &&
            lc.LineSeries
          ) {
            series = chartRef.current.addSeries(lc.LineSeries, {
              color,
              lineWidth: 1,
              priceLineVisible: false,
            });
          } else {
            series = chartRef.current.addLineSeries({
              color,
              lineWidth: 1,
              priceLineVisible: false,
            });
          }
          series.setData(boll[band]);
          indicatorSeriesRef.current[`BOLL_${band}`] = series;
        });
      }

      // Add Volume
      if (activeIndicators.includes("VOL")) {
        const volumeData = klineData.map((k) => ({
          time: k.time,
          value: k.volume,
          color: k.close >= k.open ? "#26a69a40" : "#ef535040",
        }));
        let series;
        if (
          typeof chartRef.current.addSeries === "function" &&
          lc.HistogramSeries
        ) {
          series = chartRef.current.addSeries(lc.HistogramSeries, {
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
            priceLineVisible: false,
          });
        } else {
          series = chartRef.current.addHistogramSeries({
            priceFormat: { type: "volume" },
            priceScaleId: "volume",
            priceLineVisible: false,
          });
        }
        series.setData(volumeData);
        chartRef.current
          .priceScale("volume")
          .applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        indicatorSeriesRef.current["VOL"] = series;
      }
    };

    updateIndicators();

    return () => {
      isCancelled = true;
    };
  }, [activeIndicators, klineData, chartReady]);

  const priceToY = useCallback(
    (price) => {
      if (!candleSeriesRef.current || !price) return null;
      try {
        return candleSeriesRef.current.priceToCoordinate(price);
      } catch (e) {
        return null;
      }
    },
    [priceCoordVersion, chartReady]
  );

  const yToPrice = useCallback(
    (y) => {
      if (!candleSeriesRef.current) return null;
      try {
        return candleSeriesRef.current.coordinateToPrice(y);
      } catch (e) {
        return null;
      }
    },
    [priceCoordVersion, chartReady]
  );

  const handleSLDrag = useCallback(
    (y) => {
      if (!currentPosition) return null;
      const newPrice = yToPrice(y);
      if (newPrice === null) return null;
      const entryPrice = parseFloat(currentPosition.entry_price);
      const isLong =
        currentPosition.side === "LONG" || currentPosition.side === "Long";
      if (isLong && newPrice < entryPrice && newPrice > 0) return newPrice;
      else if (!isLong && newPrice > entryPrice) return newPrice;
      return null;
    },
    [currentPosition, yToPrice]
  );

  const handleTPDrag = useCallback(
    (y) => {
      if (!currentPosition) return null;
      const newPrice = yToPrice(y);
      if (newPrice === null) return null;
      const entryPrice = parseFloat(currentPosition.entry_price);
      const isLong =
        currentPosition.side === "LONG" || currentPosition.side === "Long";
      if (isLong && newPrice > entryPrice) return newPrice;
      else if (!isLong && newPrice < entryPrice && newPrice > 0)
        return newPrice;
      return null;
    },
    [currentPosition, yToPrice]
  );

  const handleSLUpdate = useCallback(
    async (newPrice) => {
      if (!currentPosition) return;
      try {
        await setStopLoss(currentPosition.id, parseFloat(newPrice).toFixed(8));
      } catch (err) {
        console.error("Failed to update SL:", err);
      }
    },
    [currentPosition, setStopLoss]
  );

  const handleTPUpdate = useCallback(
    async (newPrice) => {
      if (!currentPosition) return;
      try {
        await setTakeProfit(
          currentPosition.id,
          parseFloat(newPrice).toFixed(8)
        );
      } catch (err) {
        console.error("Failed to update TP:", err);
      }
    },
    [currentPosition, setTakeProfit]
  );

  // Subscribe to real-time kline updates
  useEffect(() => {
    if (!chartReady) return;
    const currentInterval = chartInterval;

    const handleKline = (kline) => {
      if (
        candleSeriesRef.current &&
        kline &&
        currentSymbolRef.current === selectedSymbol &&
        kline.interval === currentInterval
      ) {
        const candle = {
          time: kline.openTime / 1000,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
        };
        candleSeriesRef.current.update(candle);
        setCurrentPrice(kline.close);
      }
    };

    const handleGenericKline = (kline) => {
      if (
        candleSeriesRef.current &&
        kline &&
        kline.symbol === selectedSymbol &&
        kline.interval === currentInterval
      ) {
        const candle = {
          time: kline.openTime / 1000,
          open: kline.open,
          high: kline.high,
          low: kline.low,
          close: kline.close,
        };
        candleSeriesRef.current.update(candle);
        setCurrentPrice(kline.close);
      }
    };

    const eventName = `kline:${selectedSymbol}:${chartInterval}`;
    binanceWS.on(eventName, handleKline);
    binanceWS.on(`kline:${selectedSymbol}`, handleGenericKline);
    binanceWS.subscribeToKlines([selectedSymbol], chartInterval);

    return () => {
      binanceWS.off(eventName, handleKline);
      binanceWS.off(`kline:${selectedSymbol}`, handleGenericKline);
    };
  }, [selectedSymbol, chartInterval, chartReady]);

  useEffect(() => {
    if (realTimeTickers?.[selectedSymbol]?.price) {
      setCurrentPrice(parseFloat(realTimeTickers[selectedSymbol].price));
    }
  }, [realTimeTickers, selectedSymbol]);

  const intervals = [
    { label: "1m", value: "1m" },
    { label: "5m", value: "5m" },
    { label: "15m", value: "15m" },
    { label: "1H", value: "1h" },
    { label: "4H", value: "4h" },
    { label: "1D", value: "1d" },
  ];

  const chartContent = (
    <div
      className={`h-full w-full bg-[#131722] ${
        isFullscreen ? "" : "rounded-lg"
      } overflow-hidden flex flex-col`}
    >
      {/* Chart Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 flex-shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold">{selectedSymbol}</span>
          {currentPrice && (
            <span
              className={`font-mono text-lg ${
                currentPosition
                  ? calculatePnL(currentPosition, currentPrice) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                  : "text-white"
              }`}
            >
              ${formatPrice(currentPrice)}
            </span>
          )}
          <IndicatorsPanel
            activeIndicators={activeIndicators}
            onToggleIndicator={handleToggleIndicator}
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {intervals.map((int) => (
              <button
                key={int.value}
                onClick={() => setChartInterval(int.value)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  chartInterval === int.value
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {int.label}
              </button>
            ))}
          </div>
          {!isFullscreen && (
            <button
              onClick={() => setIsFullscreenOpen(true)}
              title="Fullscreen"
              className="p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Position Info Bar */}
      {currentPosition && currentPosition.symbol === selectedSymbol && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800/50 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-4 text-sm">
            <span
              className={`font-semibold ${
                currentPosition.side === "LONG" ||
                currentPosition.side === "Long"
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {currentPosition.side} {currentPosition.leverage}x
            </span>
            <span className="text-gray-400">
              Size:{" "}
              <span className="text-white">
                {parseFloat(currentPosition.size).toFixed(4)}
              </span>
            </span>
            <span className="text-gray-400">
              Entry:{" "}
              <span className="text-white">
                ${formatPrice(currentPosition.entry_price)}
              </span>
            </span>
            <span className="text-gray-400">
              PnL:{" "}
              <span
                className={`font-semibold ${
                  calculatePnL(currentPosition, currentPrice) >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {calculatePnL(currentPosition, currentPrice) >= 0 ? "+" : ""}$
                {calculatePnL(currentPosition, currentPrice).toFixed(2)}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            {currentPosition.stop_loss && (
              <span className="text-red-400">
                SL: ${formatPrice(currentPosition.stop_loss)}
              </span>
            )}
            {currentPosition.take_profit && (
              <span className="text-green-400">
                TP: ${formatPrice(currentPosition.take_profit)}
              </span>
            )}
            <button
              onClick={() => closePosition(currentPosition.id)}
              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="flex-1 relative min-h-0">
        <div ref={chartContainerRef} className="absolute inset-0" />

        {/* Position Lines Overlay */}
        {chartReady &&
          currentPosition &&
          currentPosition.symbol === selectedSymbol &&
          chartHeight > 0 && (
            <div
              className="chart-overlay-container absolute inset-0 pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <DraggableLine
                type="entry"
                price={parseFloat(currentPosition.entry_price)}
                label={`${
                  currentPosition.side === "LONG" ||
                  currentPosition.side === "Long"
                    ? "L"
                    : "S"
                } ${
                  calculatePnL(currentPosition, currentPrice) >= 0 ? "+" : ""
                }${calculatePnL(currentPosition, currentPrice).toFixed(2)} USD`}
                color="#2962FF"
                bgColor="#1e40af"
                formatPrice={formatPrice}
                isDraggable={false}
                chartHeight={chartHeight}
                priceToY={priceToY}
              />

              {currentPosition.stop_loss && (
                <DraggableLine
                  type="sl"
                  price={parseFloat(currentPosition.stop_loss)}
                  label="SL"
                  color="#ef5350"
                  bgColor="#b91c1c"
                  formatPrice={formatPrice}
                  isDraggable={true}
                  chartHeight={chartHeight}
                  priceToY={priceToY}
                  onDrag={handleSLDrag}
                  onDragEnd={handleSLUpdate}
                  entryPrice={parseFloat(currentPosition.entry_price)}
                  size={parseFloat(currentPosition.size)}
                  isLong={
                    currentPosition.side === "LONG" ||
                    currentPosition.side === "Long"
                  }
                />
              )}

              {currentPosition.take_profit && (
                <DraggableLine
                  type="tp"
                  price={parseFloat(currentPosition.take_profit)}
                  label="TP"
                  color="#26a69a"
                  bgColor="#047857"
                  formatPrice={formatPrice}
                  isDraggable={true}
                  chartHeight={chartHeight}
                  priceToY={priceToY}
                  onDrag={handleTPDrag}
                  onDragEnd={handleTPUpdate}
                  entryPrice={parseFloat(currentPosition.entry_price)}
                  size={parseFloat(currentPosition.size)}
                  isLong={
                    currentPosition.side === "LONG" ||
                    currentPosition.side === "Long"
                  }
                />
              )}
            </div>
          )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#131722]/80 z-30">
            <div className="text-gray-400">Loading chart...</div>
          </div>
        )}
      </div>
    </div>
  );

  // If this is the fullscreen version, just return the content
  if (isFullscreen) return chartContent;

  // Otherwise, wrap with fullscreen overlay capability
  return (
    <>
      {chartContent}
      <FullscreenOverlay
        isOpen={isFullscreenOpen}
        onClose={() => setIsFullscreenOpen(false)}
      >
        <ChartComponent isFullscreen={true} />
      </FullscreenOverlay>
    </>
  );
});

export default function Chart() {
  return (
    <ErrorBoundary
      title="Chart Error"
      message="Unable to load chart. Please check your connection and try again."
    >
      <ChartComponent />
    </ErrorBoundary>
  );
}
