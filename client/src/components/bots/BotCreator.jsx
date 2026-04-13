import { useState, useEffect } from "react";
import {
  createBot,
  updateBot,
  getAllStrategies,
  runBacktest,
  getAllCustomStrategies,
} from "../../services/botService";
import CustomStrategyManager from "./CustomStrategyManager";

const BotCreator = ({ bot, onBotCreated, onBotUpdated, onClose }) => {
  const [formData, setFormData] = useState({
    name: bot?.name || "",
    strategy: bot?.strategy || "RSI",
    symbol: bot?.symbol || "BTCUSDT",
    timeframe: bot?.timeframe || 30,
    max_position_size: bot?.max_position_size || "0.01",
    take_profit_pct: bot?.take_profit_pct || "2.0",
    stop_loss_pct: bot?.stop_loss_pct || "1.0",
    leverage: bot?.leverage || 10,
    parameters: bot?.parameters || {},
  });

  // Fallback strategies in case API fails
  const defaultStrategies = [
    {
      id: "SMA_CROSSOVER",
      name: "SMA Crossover",
      description: "Simple Moving Average crossover strategy",
      default_parameters: { short_period: 10, long_period: 30 },
    },
    {
      id: "RSI",
      name: "RSI Strategy",
      description: "Relative Strength Index momentum strategy",
      default_parameters: { period: 14, overbought: 70, oversold: 30 },
    },
    {
      id: "MACD",
      name: "MACD Strategy",
      description: "Moving Average Convergence Divergence",
      default_parameters: {
        fast_period: 12,
        slow_period: 26,
        signal_period: 9,
      },
    },
    {
      id: "BOLLINGER_BANDS",
      name: "Bollinger Bands",
      description: "Bollinger Bands mean reversion",
      default_parameters: { period: 20, std_dev: 2 },
    },
    {
      id: "MOMENTUM",
      name: "Momentum Strategy",
      description: "Price momentum following",
      default_parameters: { period: 14, threshold: 0.02 },
    },
    {
      id: "MEAN_REVERSION",
      name: "Mean Reversion",
      description: "Mean reversion to moving average",
      default_parameters: { period: 20, threshold: 0.02 },
    },
    {
      id: "CUSTOM",
      name: "Custom Strategy",
      description: "Use your own Python trading strategy",
      default_parameters: {},
    },
  ];

  const [strategies, setStrategies] = useState(defaultStrategies);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [backtestResult, setBacktestResult] = useState(null);
  const [backtesting, setBacktesting] = useState(false);
  const [showStrategyManager, setShowStrategyManager] = useState(false);
  const [customStrategies, setCustomStrategies] = useState([]);

  const symbols = [
    "BTCUSDT",
    "ETHUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "ADAUSDT",
    "SOLUSDT",
    "DOTUSDT",
    "SUIUSDT",
  ];

  useEffect(() => {
    fetchStrategies();
    fetchCustomStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      const data = await getAllStrategies();
      if (data && data.length > 0) {
        setStrategies(data);
      }
      // If data is empty or undefined, keep using defaultStrategies

      // Set default parameters for selected strategy
      const strategyList = data && data.length > 0 ? data : defaultStrategies;
      if (strategyList.length > 0 && !bot) {
        const defaultStrategy = strategyList.find(
          (s) => s.id === formData.strategy
        );
        if (defaultStrategy) {
          setFormData((prev) => ({
            ...prev,
            parameters: defaultStrategy.default_parameters,
          }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch strategies:", err);
      // Use default strategies on error
      setStrategies(defaultStrategies);
    }
  };

  const fetchCustomStrategies = async () => {
    try {
      const data = await getAllCustomStrategies();
      setCustomStrategies(data);
    } catch (err) {
      console.error("Failed to fetch custom strategies:", err);
      setCustomStrategies([]);
    }
  };

  const handleCustomStrategySelected = (strategyName) => {
    setFormData((prev) => ({
      ...prev,
      strategy: "CUSTOM",
      parameters: { custom_strategy_name: strategyName },
    }));
    setShowStrategyManager(false);
  };

  const handleStrategyChange = (strategyId) => {
    const strategy = strategies.find((s) => s.id === strategyId);
    setFormData((prev) => ({
      ...prev,
      strategy: strategyId,
      parameters: strategy ? strategy.default_parameters : {},
    }));
    setBacktestResult(null);
  };

  const handleParameterChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: parseFloat(value) || value,
      },
    }));
  };

  const handleBacktest = async () => {
    try {
      setBacktesting(true);
      const result = await runBacktest({
        strategy: formData.strategy,
        symbol: formData.symbol,
        parameters: formData.parameters,
        initial_capital: 10000,
      });
      setBacktestResult(result);
    } catch (err) {
      alert("Backtest failed: " + err.message);
    } finally {
      setBacktesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (bot) {
        const updated = await updateBot(bot.id, formData);
        onBotUpdated(updated);
      } else {
        const created = await createBot(formData);
        onBotCreated(created);
      }
    } catch (err) {
      console.error("Bot creation/update error:", err);
      const errorMessage =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to save bot";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const selectedStrategy = strategies.find((s) => s.id === formData.strategy);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">
          {bot ? "Edit Bot" : "Create New Bot"}
        </h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white text-2xl"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bot Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Bot Name
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="My Trading Bot"
            required
          />
        </div>

        {/* Strategy */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Strategy
          </label>
          <select
            value={formData.strategy}
            onChange={(e) => handleStrategyChange(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          >
            {strategies.map((strategy) => (
              <option key={strategy.id} value={strategy.id}>
                {strategy.name}
              </option>
            ))}
          </select>
        </div>

        {/* Timeframe */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Timeframe
          </label>
          <select
            value={formData.timeframe}
            onChange={(e) =>
              setFormData({ ...formData, timeframe: parseInt(e.target.value) })
            }
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          >
            <option value="1">1 Minute</option>
            <option value="5">5 Minutes</option>
            <option value="15">15 Minutes</option>
            <option value="30">30 Minutes</option>
            <option value="60">1 Hour</option>
            <option value="240">4 Hours</option>
            <option value="1440">1 Day</option>
          </select>
          <p className="text-xs text-gray-400 mt-1">
            ⚠️ Match this with your TradingView chart timeframe for accurate
            signals
          </p>
        </div>

        {/* Strategy Description */}
        <div>
          {selectedStrategy && (
            <p className="text-sm text-gray-400 mt-1">
              {selectedStrategy.description}
            </p>
          )}
          {formData.strategy === "CUSTOM" && (
            <div className="mt-4">
              {formData.parameters?.custom_strategy_name ? (
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-sm text-gray-400">
                        Selected Custom Strategy:
                      </span>
                      <div className="text-white font-semibold">
                        {formData.parameters.custom_strategy_name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStrategyManager(true)}
                      className="text-sm text-blue-400 hover:text-blue-300"
                    >
                      Change
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowStrategyManager(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  📜 Select Custom Strategy
                </button>
              )}
            </div>
          )}
        </div>

        {/* Symbol */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Trading Symbol
          </label>
          <select
            value={formData.symbol}
            onChange={(e) =>
              setFormData({ ...formData, symbol: e.target.value })
            }
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            required
          >
            {symbols.map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>

        {/* Strategy Parameters */}
        {selectedStrategy &&
          Object.keys(selectedStrategy.default_parameters).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy Parameters
              </label>
              <div className="bg-gray-700/50 rounded-lg p-4 space-y-3">
                {Object.entries(selectedStrategy.default_parameters).map(
                  ([key, defaultValue]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <label className="text-sm text-gray-300 capitalize">
                        {key.replace(/_/g, " ")}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.parameters[key] ?? defaultValue}
                        onChange={(e) =>
                          handleParameterChange(key, e.target.value)
                        }
                        className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )
                )}
              </div>
            </div>
          )}

        {/* Risk Management */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Position Size
            </label>
            <input
              type="number"
              step="0.001"
              value={formData.max_position_size}
              onChange={(e) =>
                setFormData({ ...formData, max_position_size: e.target.value })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">Amount to trade</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-green-300 mb-2">
              Take Profit (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.take_profit_pct}
              onChange={(e) =>
                setFormData({ ...formData, take_profit_pct: e.target.value })
              }
              className="w-full bg-gray-700 border border-green-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-green-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              🎯 Auto close with profit
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-red-300 mb-2">
              Stop Loss (%)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.stop_loss_pct}
              onChange={(e) =>
                setFormData({ ...formData, stop_loss_pct: e.target.value })
              }
              className="w-full bg-gray-700 border border-red-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-red-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              🛡️ Auto close to limit loss
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Leverage
            </label>
            <input
              type="number"
              min="1"
              max="125"
              value={formData.leverage}
              onChange={(e) =>
                setFormData({ ...formData, leverage: parseInt(e.target.value) })
              }
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-xs text-gray-400 mt-1">
              Trading leverage (1-125x)
            </p>
          </div>
        </div>

        {/* Backtest Results */}
        {backtestResult && (
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3">
              Backtest Results
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-gray-400">Total Return</div>
                <div
                  className={`font-semibold ${
                    backtestResult.total_return >= 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {backtestResult.total_return?.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">Win Rate</div>
                <div className="font-semibold text-white">
                  {backtestResult.win_rate?.toFixed(2)}%
                </div>
              </div>
              <div>
                <div className="text-gray-400">Total Trades</div>
                <div className="font-semibold text-white">
                  {backtestResult.total_trades}
                </div>
              </div>
              <div>
                <div className="text-gray-400">Sharpe Ratio</div>
                <div className="font-semibold text-white">
                  {backtestResult.sharpe_ratio?.toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleBacktest}
            disabled={backtesting}
            className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {backtesting ? "Backtesting..." : "🔬 Backtest Strategy"}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            {loading ? "Saving..." : bot ? "Update Bot" : "Create Bot"}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Custom Strategy Manager Modal */}
      {showStrategyManager && (
        <CustomStrategyManager
          onClose={() => setShowStrategyManager(false)}
          onStrategySelected={handleCustomStrategySelected}
        />
      )}
    </div>
  );
};

export default BotCreator;
