import { memo, useMemo, useState, useCallback } from "react";
import { useTrading } from "../../contexts/TradingContext";
import {
  formatPriceBySymbol,
  getSymbolPrecision,
} from "../../utils/formatters";

// Custom Warning Modal Component
function OrderWarningModal({
  isOpen,
  onClose,
  onConfirm,
  warningData,
  selectedSymbol,
}) {
  if (!isOpen || !warningData) return null;

  const { limitPrice, marketPrice, side } = warningData;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-yellow-500 rounded-lg p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">⚠️</span>
          <h3 className="text-lg font-semibold text-yellow-400">
            Order Execution Warning
          </h3>
        </div>

        {/* Warning Content */}
        <div className="mb-6 space-y-3">
          <p className="text-gray-300">
            The current order will encounter the following circumstances:
          </p>

          <div className="bg-yellow-900/20 border border-yellow-600/50 rounded p-3">
            <div className="space-y-2 text-sm">
              <div className="flex items-start">
                <span className="text-yellow-400 mr-2">1.</span>
                <span className="text-gray-300">
                  Your limit order will be executed immediately as a MARKET
                  order.
                </span>
              </div>
              <div className="flex items-start">
                <span className="text-yellow-400 mr-2">2.</span>
                <span className="text-gray-300">
                  You will get the current market price, NOT your limit price.
                </span>
              </div>
            </div>
          </div>

          {/* Price Comparison */}
          <div className="bg-gray-700 rounded p-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Current Market Price:</span>
              <span className="font-mono text-white">
                ${formatPriceBySymbol(marketPrice, selectedSymbol)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Limit Price:</span>
              <span className="font-mono text-white">
                ${formatPriceBySymbol(limitPrice, selectedSymbol)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Order Side:</span>
              <span
                className={`font-medium ${
                  side === "BUY" ? "text-green-400" : "text-red-400"
                }`}
              >
                {side}
              </span>
            </div>
          </div>

          <p className="text-gray-300 text-sm">
            Do you want to proceed with this order as a{" "}
            <strong className="text-yellow-400">MARKET order</strong>?
          </p>
        </div>

        {/* Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded font-medium transition-colors"
          >
            Proceed as Market Order
          </button>
        </div>
      </div>
    </div>
  );
}

function OrderForm() {
  const { createOrder, selectedSymbol, marketData, loading } = useTrading();
  const [orderType, setOrderType] = useState("MARKET");
  const [side, setSide] = useState("BUY");
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [leverage, setLeverage] = useState(10);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningData, setWarningData] = useState(null);

  // Max quantities for each symbol
  const maxQuantities = {
    BTCUSDT: 100,
    ETHUSDT: 1000,
    XRPUSDT: 1000000,
    ADAUSDT: 1000000,
    BNBUSDT: 1000,
    DOTUSDT: 100000,
    SOLUSDT: 10000,
    SUIUSDT: 500000,
    DOGEUSDT: 5000000,
    LINKUSDT: 50000,
    XLMUSDT: 1000000,
    LTCUSDT: 10000,
  };

  const maxQuantity = maxQuantities[selectedSymbol] || 10000;

  const currentMarketData = useMemo(
    () => marketData.find((m) => m.symbol === selectedSymbol),
    [marketData, selectedSymbol]
  );
  const currentPrice = currentMarketData?.price || 0;

  // Handle modal confirmation
  const handleWarningConfirm = useCallback(async () => {
    if (!warningData) return;

    setShowWarningModal(false);
    setIsSubmitting(true);

    try {
      const result = await createOrder(warningData.orderRequest);

      // Reset form
      setQuantity("");
      setPrice("");

      // Show success message
      setSuccess(`Market order executed successfully`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      // Extract error message
      let errorMessage = "Failed to create order";

      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setError(errorMessage);

      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsSubmitting(false);
      setWarningData(null);
    }
  }, [warningData, createOrder]);

  // Handle modal close
  const handleWarningClose = useCallback(() => {
    setShowWarningModal(false);
    setWarningData(null);
    setIsSubmitting(false);
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError(null);
      setSuccess(null);

      try {
        setIsSubmitting(true);

        // Validate limit order pricing and convert to market order if needed
        let finalOrderType = orderType;
        let finalPrice = orderType === "LIMIT" ? parseFloat(price) : null;

        if (orderType === "LIMIT") {
          const limitPrice = parseFloat(price);
          const marketPrice = parseFloat(currentPrice);

          // Check if limit order would execute immediately
          // BUY limit: warns if buying ABOVE market price (will execute immediately)
          // SELL limit: warns if selling BELOW market price (will execute immediately)
          const shouldWarn =
            (side === "BUY" && limitPrice > marketPrice) ||
            (side === "SELL" && limitPrice < marketPrice);

          if (shouldWarn) {
            // Show custom warning modal instead of browser confirm
            setWarningData({
              limitPrice,
              marketPrice,
              side,
              orderRequest: {
                symbol: selectedSymbol,
                side,
                type: "MARKET", // Will be converted to market order
                quantity: parseFloat(quantity),
                price: null,
                current_price: parseFloat(currentPrice),
                leverage,
                reduce_only: false,
              },
            });
            setShowWarningModal(true);
            setIsSubmitting(false);
            return;
          }
        }

        const orderRequest = {
          symbol: selectedSymbol,
          side,
          type: finalOrderType,
          quantity: parseFloat(quantity),
          price: finalPrice,
          current_price: parseFloat(currentPrice), // Always send current market price
          leverage,
          reduce_only: false,
        };

        const result = await createOrder(orderRequest);

        // Reset form
        setQuantity("");
        setPrice("");

        // Show success message
        if (orderType === "LIMIT" && result?.status === "PENDING") {
          setSuccess(`Limit order placed at ${orderRequest.price}`);
        } else {
          setSuccess(`Order executed successfully`);
        }

        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } catch (error) {
        // Extract error message
        let errorMessage = "Failed to create order";

        if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);

        // Clear error after 5 seconds
        setTimeout(() => setError(null), 5000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      createOrder,
      currentPrice,
      leverage,
      orderType,
      price,
      quantity,
      selectedSymbol,
      side,
    ]
  );

  const notional = useMemo(() => {
    const qty = parseFloat(quantity) || 0;
    const orderPrice =
      orderType === "LIMIT" ? parseFloat(price) || 0 : currentPrice;
    return qty * orderPrice;
  }, [quantity, orderType, price, currentPrice]);

  const margin = useMemo(() => {
    return notional / leverage;
  }, [notional, leverage]);

  // Check if limit order would execute immediately
  const limitOrderWarning = useMemo(() => {
    if (orderType !== "LIMIT" || !price || !currentPrice) return null;

    const limitPrice = parseFloat(price);
    const marketPrice = parseFloat(currentPrice);

    // BUY limit: warns only if buying ABOVE market price
    if (side === "BUY" && limitPrice > marketPrice) {
      return {
        type: "warning",
        message: `Buy limit price ($${formatPriceBySymbol(
          limitPrice,
          selectedSymbol
        )}) is above market price ($${formatPriceBySymbol(
          marketPrice,
          selectedSymbol
        )}). This order will execute immediately as a market buy.`,
      };
    }

    // SELL limit: warns only if selling BELOW market price
    if (side === "SELL" && limitPrice < marketPrice) {
      return {
        type: "warning",
        message: `Sell limit price ($${formatPriceBySymbol(
          limitPrice,
          selectedSymbol
        )}) is below market price ($${formatPriceBySymbol(
          marketPrice,
          selectedSymbol
        )}). This order will execute immediately as a market sell.`,
      };
    }

    return null;
  }, [orderType, price, currentPrice, side, selectedSymbol]);

  return (
    <>
      {/* Warning Modal */}
      <OrderWarningModal
        isOpen={showWarningModal}
        onClose={handleWarningClose}
        onConfirm={handleWarningConfirm}
        warningData={warningData}
        selectedSymbol={selectedSymbol}
      />

      <div className="trading-panel max-w-full">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">Place Order</h3>
          <div className="text-xs text-gray-400 font-mono">
            Current: ${formatPriceBySymbol(currentPrice, selectedSymbol)}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-600/50 rounded-lg">
            <p className="text-sm text-red-400 flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </p>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-4 p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
            <p className="text-sm text-green-400 flex items-center">
              <span className="mr-2">✅</span>
              {success}
            </p>
          </div>
        )}

        {/* Limit Order Warning */}
        {limitOrderWarning && (
          <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
            <p className="text-sm text-yellow-400 flex items-start">
              <span className="mr-2 mt-0.5">⚠️</span>
              <span>
                <strong>Warning:</strong> {limitOrderWarning.message}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Symbol
            </label>
            <input
              type="text"
              value={selectedSymbol}
              disabled
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white"
            />
          </div>

          {/* Order Type & Side in one row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Order Type
              </label>
              <select
                value={orderType}
                onChange={(e) => setOrderType(e.target.value)}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value="MARKET">Market</option>
                <option value="LIMIT">Limit</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Leverage: {leverage}x
              </label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(parseInt(e.target.value))}
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
              >
                <option value={1}>1x</option>
                <option value={2}>2x</option>
                <option value={5}>5x</option>
                <option value={10}>10x</option>
                <option value={20}>20x</option>
                <option value={50}>50x</option>
                <option value={125}>125x</option>
              </select>
            </div>
          </div>

          {/* Side */}
          <div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSide("BUY")}
                className={`py-2 px-3 rounded font-medium text-sm ${
                  side === "BUY"
                    ? "bg-green-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Buy / Long
              </button>
              <button
                type="button"
                onClick={() => setSide("SELL")}
                className={`py-2 px-3 rounded font-medium text-sm ${
                  side === "SELL"
                    ? "bg-red-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                Sell / Short
              </button>
            </div>
          </div>

          {/* Quantity and Price inputs */}
          <div
            className={orderType === "LIMIT" ? "grid grid-cols-2 gap-3" : ""}
          >
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">
                Quantity
                <span className="text-gray-500 ml-2">
                  (Max: {maxQuantity.toLocaleString()})
                </span>
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (value > maxQuantity) {
                    setError(
                      `Maximum quantity is ${maxQuantity.toLocaleString()} for ${selectedSymbol}`
                    );
                    setTimeout(() => setError(null), 3000);
                  } else {
                    setQuantity(e.target.value);
                  }
                }}
                step="0.001"
                min="0"
                max={maxQuantity}
                placeholder="0.000"
                className="w-full px-2 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                required
              />
            </div>

            {/* Price (for limit orders) */}
            {orderType === "LIMIT" && (
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Price
                  <span className="text-gray-500 ml-2">
                    (Market: {formatPriceBySymbol(currentPrice, selectedSymbol)}
                    )
                  </span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  min="0"
                  placeholder={formatPriceBySymbol(
                    currentPrice,
                    selectedSymbol
                  )}
                  step={`0.${"0".repeat(
                    getSymbolPrecision(selectedSymbol) - 1
                  )}1`}
                  className={`w-full px-2 py-2 bg-gray-700 rounded text-white text-sm ${
                    limitOrderWarning
                      ? "border-2 border-yellow-500"
                      : "border border-gray-600"
                  }`}
                  required
                />
                {limitOrderWarning && (
                  <div className="text-xs text-yellow-400 mt-1 flex items-center">
                    <span className="mr-1">⚠️</span>
                    May execute immediately
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {quantity && (
            <div className="bg-gray-700 p-3 rounded space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Notional:</span>
                <span className="font-mono">${notional.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Margin:</span>
                <span className="font-mono">${margin.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-400">Fee:</span>
                <span className="font-mono">
                  ${(notional * 0.00055).toFixed(4)}
                </span>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || loading || !quantity}
            className={`w-full py-3 px-4 rounded font-medium ${
              side === "BUY"
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? "Placing Order..." : `${side} ${selectedSymbol}`}
          </button>
        </form>
      </div>
    </>
  );
}

export default memo(OrderForm);
