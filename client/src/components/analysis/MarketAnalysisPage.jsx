import { useState } from "react";
import Header from "../trading/Header";
import LoadingSpinner from "../ui/LoadingSpinner";
import FearGreedIndex from "./FearGreedIndex";
import TechnicalAnalysis from "./TechnicalAnalysis";

export default function MarketAnalysisPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      {error && (
        <div className="mx-4 mb-4 bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="p-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold neon-text terminal-text mb-2">
            📊 MARKET ANALYSIS
          </h1>
          <p className="text-gray-400 terminal-text">
            Real-time market sentiment and technical analysis tools
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <LoadingSpinner size="lg" text="Loading market analysis..." />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fear & Greed Index */}
            <FearGreedIndex />

            {/* Technical Analysis */}
            <TechnicalAnalysis />
          </div>
        )}

        {/* Additional Analysis Tools Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold neon-text terminal-text mb-4">
            Market Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="cyber-panel p-4">
              <h3 className="text-sm font-medium neon-text-cyan terminal-text mb-2">
                Market Sentiment
              </h3>
              <p className="text-xs text-gray-400">
                Real-time sentiment analysis from multiple sources
              </p>
            </div>
            <div className="cyber-panel p-4">
              <h3 className="text-sm font-medium neon-text-cyan terminal-text mb-2">
                Technical Indicators
              </h3>
              <p className="text-xs text-gray-400">
                Comprehensive technical analysis across timeframes
              </p>
            </div>
            <div className="cyber-panel p-4">
              <h3 className="text-sm font-medium neon-text-cyan terminal-text mb-2">
                Market Overview
              </h3>
              <p className="text-xs text-gray-400">
                Key metrics and market performance indicators
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
