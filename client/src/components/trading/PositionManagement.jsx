import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTrading } from "../../contexts/TradingContext";
import {
  formatPriceBySymbol,
  formatCurrency,
  formatQuantity,
} from "../../utils/formatters";

export default function PositionManagement({ position, onClose, onAction }) {
  const { closePosition, setStopLoss, setTakeProfit } = useTrading();
  const [stopLoss, setStopLossValue] = useState(position.stop_loss || "");
  const [takeProfit, setTakeProfitValue] = useState(position.take_profit || "");
  const [isLoading, setIsLoading] = useState(false);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Calculate expected PnL for TP/SL like Binance/Bybit
  const calculations = useMemo(() => {
    const entryPrice = parseFloat(position.entry_price || 0);
    const currentPrice = parseFloat(position.mark_price || entryPrice);
    const size = parseFloat(position.size || 0);
    const isLong = position.side === "LONG" || position.side === "Long";

    // Current unrealized PnL
    const currentPnL = isLong
      ? (currentPrice - entryPrice) * size
      : (entryPrice - currentPrice) * size;

    // Stop Loss calculations
    const slPrice = parseFloat(stopLoss || 0);
    const slPnL =
      slPrice > 0
        ? isLong
          ? (slPrice - entryPrice) * size
          : (entryPrice - slPrice) * size
        : 0;
    const slPercentage =
      entryPrice > 0 ? (slPnL / (entryPrice * size)) * 100 : 0;

    // Take Profit calculations
    const tpPrice = parseFloat(takeProfit || 0);
    const tpPnL =
      tpPrice > 0
        ? isLong
          ? (tpPrice - entryPrice) * size
          : (entryPrice - tpPrice) * size
        : 0;
    const tpPercentage =
      entryPrice > 0 ? (tpPnL / (entryPrice * size)) * 100 : 0;

    // Price distance from current
    const slDistance =
      slPrice > 0
        ? Math.abs(((slPrice - currentPrice) / currentPrice) * 100)
        : 0;
    const tpDistance =
      tpPrice > 0
        ? Math.abs(((tpPrice - currentPrice) / currentPrice) * 100)
        : 0;

    return {
      currentPnL,
      slPnL,
      slPercentage,
      tpPnL,
      tpPercentage,
      slDistance,
      tpDistance,
      entryPrice,
      currentPrice,
      isLong,
    };
  }, [position, stopLoss, takeProfit]);

  const handleClosePosition = async () => {
    try {
      setIsLoading(true);
      await closePosition(position.id);
      onAction("Position closed successfully");
      onClose();
    } catch (error) {
      onAction(`Failed to close position: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStopLoss = async () => {
    if (!stopLoss) {
      onAction("Please enter a stop loss price", "error");
      return;
    }

    const slPrice = parseFloat(stopLoss);
    const entryPrice = parseFloat(position.entry_price);
    const isLong = position.side === "LONG" || position.side === "Long";

    // Validate SL direction
    if (isLong && slPrice >= entryPrice) {
      onAction(
        "Stop loss must be below entry price for long positions",
        "error"
      );
      return;
    }
    if (!isLong && slPrice <= entryPrice) {
      onAction(
        "Stop loss must be above entry price for short positions",
        "error"
      );
      return;
    }

    try {
      setIsLoading(true);
      await setStopLoss(position.id, slPrice);
      onAction("Stop loss set successfully");
    } catch (error) {
      onAction(`Failed to set stop loss: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetTakeProfit = async () => {
    if (!takeProfit) {
      onAction("Please enter a take profit price", "error");
      return;
    }

    const tpPrice = parseFloat(takeProfit);
    const entryPrice = parseFloat(position.entry_price);
    const isLong = position.side === "LONG" || position.side === "Long";

    // Validate TP direction
    if (isLong && tpPrice <= entryPrice) {
      onAction(
        "Take profit must be above entry price for long positions",
        "error"
      );
      return;
    }
    if (!isLong && tpPrice >= entryPrice) {
      onAction(
        "Take profit must be below entry price for short positions",
        "error"
      );
      return;
    }

    try {
      setIsLoading(true);
      await setTakeProfit(position.id, tpPrice);
      onAction("Take profit set successfully");
    } catch (error) {
      onAction(`Failed to set take profit: ${error.message}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 modal-overlay flex items-center justify-center z-[9999] p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto modal-content modal-animate">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">Manage Position</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Position Info */}
        <div className="bg-gray-700 p-3 rounded mb-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Symbol:</span>
              <span className="font-medium">{position.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Side:</span>
              <span
                className={`font-medium ${
                  calculations.isLong ? "text-green-500" : "text-red-500"
                }`}
              >
                {position.side}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Size:</span>
              <span className="font-medium">{position.size}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Leverage:</span>
              <span className="font-medium">{position.leverage}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Entry:</span>
              <span className="font-medium font-mono">
                ${formatPriceBySymbol(calculations.entryPrice, position.symbol)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Mark:</span>
              <span className="font-medium font-mono">
                $
                {formatPriceBySymbol(
                  calculations.currentPrice,
                  position.symbol
                )}
              </span>
            </div>
          </div>

          {/* Current PnL */}
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Unrealized PnL:</span>
              <span
                className={`font-bold ${
                  calculations.currentPnL >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                ${calculations.currentPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Stop Loss */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Stop Loss
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={stopLoss}
              onChange={(e) => setStopLossValue(e.target.value)}
              step="0.0001"
              placeholder={`${
                calculations.isLong ? "Below" : "Above"
              } ${formatPriceBySymbol(
                calculations.currentPrice,
                position.symbol
              )}`}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <button
              onClick={handleSetStopLoss}
              disabled={isLoading}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm disabled:opacity-50"
            >
              Set SL
            </button>
          </div>

          {/* SL Quick Presets */}
          <div className="flex gap-1 mb-2">
            <span className="text-xs text-gray-500 mr-2">Quick:</span>
            {[1, 2, 5, 10].map((percent) => {
              const slPrice = calculations.isLong
                ? calculations.entryPrice * (1 - percent / 100)
                : calculations.entryPrice * (1 + percent / 100);
              return (
                <button
                  key={percent}
                  onClick={() => setStopLossValue(slPrice.toFixed(4))}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-xs rounded"
                >
                  -{percent}%
                </button>
              );
            })}
          </div>

          {/* SL Calculations */}
          {stopLoss && parseFloat(stopLoss) > 0 && (
            <div className="mt-2 p-2 bg-red-900/20 border border-red-800 rounded text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Expected Loss:</span>
                <span className="text-red-400 font-medium">
                  ${calculations.slPnL.toFixed(2)} (
                  {calculations.slPercentage.toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distance:</span>
                <span className="text-gray-300">
                  {calculations.slDistance.toFixed(2)}% from mark
                </span>
              </div>
            </div>
          )}

          {position.stop_loss && (
            <div className="text-xs text-gray-400 mt-1">
              Current SL: ${parseFloat(position.stop_loss).toFixed(4)}
            </div>
          )}
        </div>

        {/* Take Profit */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Take Profit
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="number"
              value={takeProfit}
              onChange={(e) => setTakeProfitValue(e.target.value)}
              step="0.0001"
              placeholder={`${
                calculations.isLong ? "Above" : "Below"
              } ${formatPriceBySymbol(
                calculations.currentPrice,
                position.symbol
              )}`}
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
            />
            <button
              onClick={handleSetTakeProfit}
              disabled={isLoading}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm disabled:opacity-50"
            >
              Set TP
            </button>
          </div>

          {/* TP Quick Presets */}
          <div className="flex gap-1 mb-2">
            <span className="text-xs text-gray-500 mr-2">Quick:</span>
            {[1, 2, 5, 10, 20].map((percent) => {
              const tpPrice = calculations.isLong
                ? calculations.entryPrice * (1 + percent / 100)
                : calculations.entryPrice * (1 - percent / 100);
              return (
                <button
                  key={percent}
                  onClick={() => setTakeProfitValue(tpPrice.toFixed(4))}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-xs rounded"
                >
                  +{percent}%
                </button>
              );
            })}
          </div>

          {/* TP Calculations */}
          {takeProfit && parseFloat(takeProfit) > 0 && (
            <div className="mt-2 p-2 bg-green-900/20 border border-green-800 rounded text-xs">
              <div className="flex justify-between mb-1">
                <span className="text-gray-400">Expected Profit:</span>
                <span className="text-green-400 font-medium">
                  ${calculations.tpPnL.toFixed(2)} (
                  {calculations.tpPercentage.toFixed(2)}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Distance:</span>
                <span className="text-gray-300">
                  {calculations.tpDistance.toFixed(2)}% from mark
                </span>
              </div>
            </div>
          )}

          {position.take_profit && (
            <div className="text-xs text-gray-400 mt-1">
              Current TP: ${parseFloat(position.take_profit).toFixed(4)}
            </div>
          )}
        </div>

        {/* Risk/Reward Ratio */}
        {stopLoss &&
          takeProfit &&
          parseFloat(stopLoss) > 0 &&
          parseFloat(takeProfit) > 0 && (
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800 rounded">
              <h4 className="text-sm font-medium text-blue-400 mb-2">
                Risk/Reward Analysis
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Risk:</span>
                  <span className="ml-2 text-red-400 font-medium">
                    ${Math.abs(calculations.slPnL).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Reward:</span>
                  <span className="ml-2 text-green-400 font-medium">
                    ${Math.abs(calculations.tpPnL).toFixed(2)}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400">R:R Ratio:</span>
                  <span className="ml-2 text-blue-400 font-medium">
                    1:
                    {Math.abs(calculations.slPnL) > 0
                      ? (
                          Math.abs(calculations.tpPnL) /
                          Math.abs(calculations.slPnL)
                        ).toFixed(2)
                      : "0"}
                  </span>
                </div>
              </div>
            </div>
          )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClosePosition}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium disabled:opacity-50"
          >
            {isLoading ? "Closing..." : "Close Position"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
