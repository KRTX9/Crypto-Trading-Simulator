import { useState, useEffect } from "react";
import {
  getFearGreedIndex,
  getSentimentColor,
  retryApiCall,
} from "../../services/marketAnalysisService";

export default function FearGreedIndex() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchFearGreedData = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await retryApiCall(() => getFearGreedIndex());
      setData(result);
      setLastUpdated(new Date());

      if (result.isStale) {
        setError("Using cached data - API temporarily unavailable");
      } else if (result.isMockData) {
        setError("Using demo data - API temporarily unavailable");
      }
    } catch (err) {
      console.error("Failed to fetch Fear & Greed Index:", err);
      setError(err.message || "Failed to load Fear & Greed Index");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFearGreedData();

    // Set up auto-refresh every 5 minutes
    const interval = setInterval(fetchFearGreedData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  const CircularGauge = ({ value }) => {
    const radius = 80;
    const strokeWidth = 12;
    const normalizedRadius = radius - strokeWidth * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (value / 100) * circumference;

    // Create gradient segments for the gauge
    const getGradientId = () => "fearGreedGradient";

    return (
      <div className="relative flex items-center justify-center">
        <svg
          height={radius * 2}
          width={radius * 2}
          className="transform -rotate-90"
        >
          <defs>
            <linearGradient
              id={getGradientId()}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            stroke="#374151"
            fill="transparent"
            strokeWidth={strokeWidth}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />

          {/* Progress circle */}
          <circle
            stroke={`url(#${getGradientId()})`}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div
            className="text-3xl font-bold"
            style={{ color: getSentimentColor(value) }}
          >
            {value}
          </div>
          <div className="text-xs text-gray-400 mt-1">INDEX</div>
        </div>
      </div>
    );
  };

  const getSentimentEmoji = (value) => {
    if (value <= 25) return "😨";
    if (value <= 45) return "😟";
    if (value <= 55) return "😐";
    if (value <= 75) return "😊";
    return "🤑";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = new Date(parseInt(timestamp) * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="cyber-panel p-6">
        <h2 className="text-lg font-semibold neon-text-cyan terminal-text mb-4">
          Fear & Greed Index
        </h2>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="cyber-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold neon-text-cyan terminal-text">
          Fear & Greed Index
        </h2>
        <button
          onClick={fetchFearGreedData}
          disabled={loading}
          className="text-xs cyber-button px-2 py-1 disabled:opacity-50"
          title="Refresh data"
        >
          🔄
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm">
          {error}
        </div>
      )}

      {data ? (
        <div className="space-y-4">
          {/* Circular Gauge */}
          <div className="flex justify-center">
            <CircularGauge value={data.value} />
          </div>

          {/* Sentiment Information */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl">{getSentimentEmoji(data.value)}</span>
              <span
                className="text-xl font-bold"
                style={{ color: getSentimentColor(data.value) }}
              >
                {data.value_classification}
              </span>
            </div>

            <div className="text-sm text-gray-400">
              Market sentiment is currently showing{" "}
              <span style={{ color: getSentimentColor(data.value) }}>
                {data.value_classification.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Sentiment Scale */}
          <div className="mt-6">
            <div className="text-xs text-gray-400 mb-2 text-center">
              Sentiment Scale
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-red-400">Extreme Fear</span>
              <span className="text-orange-400">Fear</span>
              <span className="text-yellow-400">Neutral</span>
              <span className="text-green-400">Greed</span>
              <span className="text-green-500">Extreme Greed</span>
            </div>
            <div className="w-full h-2 bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 rounded-full mt-1"></div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* Metadata */}
          <div className="mt-4 pt-4 border-t border-gray-600 space-y-1">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Last Updated:</span>
              <span>{formatTimestamp(data.timestamp)}</span>
            </div>
            {lastUpdated && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Refreshed:</span>
                <span>{lastUpdated.toLocaleTimeString()}</span>
              </div>
            )}
            {data.time_until_update && (
              <div className="flex justify-between text-xs text-gray-400">
                <span>Next Update:</span>
                <span>{data.time_until_update}</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-gray-800 bg-opacity-50 rounded text-xs text-gray-400">
            <div className="font-medium text-neon-cyan mb-1">
              About Fear & Greed Index
            </div>
            <div>
              The Fear & Greed Index analyzes emotions and sentiments from
              different sources and crunches them into one simple number: The
              Fear & Greed Index for Bitcoin and crypto.
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>No data available</p>
            <button
              onClick={fetchFearGreedData}
              className="mt-2 cyber-button px-4 py-2 text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
