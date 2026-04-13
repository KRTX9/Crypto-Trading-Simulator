import { useTrading } from "../../contexts/TradingContext";
import { useOrderBook } from "../../hooks/useWebSocket";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function OrderBook() {
  const { selectedSymbol } = useTrading();
  const { orderBook, loading } = useOrderBook(selectedSymbol);

  // Fallback mock order book data when real data is not available
  const mockOrderBook = {
    bids: [
      [45450.5, 0.125],
      [45449.25, 0.25],
      [45448.0, 0.18],
      [45447.75, 0.32],
      [45446.5, 0.45],
      [45445.25, 0.2],
      [45444.0, 0.18],
      [45443.75, 0.32],
      [45442.5, 0.45],
      [45441.25, 0.2],
    ],
    asks: [
      [45551.25, 0.2],
      [45552.5, 0.45],
      [45553.75, 0.32],
      [45554.0, 0.18],
      [45555.25, 0.2],
      [45556.5, 0.45],
      [45557.75, 0.32],
      [45558.0, 0.18],
      [45559.25, 0.25],
      [45560.5, 0.125],
    ],
  };

  // Use real-time data if available, otherwise fallback to mock
  const displayOrderBook = orderBook || {
    bids: mockOrderBook.bids.map(([price, qty]) => ({ price, quantity: qty })),
    asks: mockOrderBook.asks.map(([price, qty]) => ({ price, quantity: qty })),
  };

  const formatPrice = (price) => {
    return price.toFixed(2);
  };

  const formatQuantity = (qty) => {
    return qty.toFixed(3);
  };

  if (loading && !orderBook) {
    return (
      <div className="trading-panel h-full">
        <h3 className="text-lg font-semibold mb-4">
          Order Book - {selectedSymbol}
        </h3>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="sm" text="Loading order book..." />
        </div>
      </div>
    );
  }

  return (
    <div className="trading-panel h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold">Order Book</h3>
        <div className="text-right">
          <div className="text-xs font-medium">{selectedSymbol}</div>
          {orderBook && <span className="text-xs text-green-500">• Live</span>}
        </div>
      </div>

      <div className="space-y-2 h-full overflow-hidden">
        {/* Asks (Sell orders) */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-red-400 mb-2">Asks</h4>
          <div className="space-y-0.5">
            {displayOrderBook.asks
              .slice(0, 8)
              .reverse()
              .map((level, index) => (
                <div
                  key={index}
                  className="flex justify-between text-sm order-book-ask py-1 px-2 rounded"
                >
                  <span className="text-red-400 font-mono">
                    ${formatPrice(level.price)}
                  </span>
                  <span className="text-gray-300 font-mono">
                    {formatQuantity(level.quantity)}
                  </span>
                </div>
              ))}
          </div>
        </div>

        {/* Spread */}
        <div className="border-t border-b border-gray-600 py-1">
          <div className="text-center">
            <div className="text-xs text-gray-400">Spread</div>
            <div className="text-xs font-medium font-mono">
              $
              {displayOrderBook.asks[0] && displayOrderBook.bids[0]
                ? (
                    displayOrderBook.asks[0].price -
                    displayOrderBook.bids[0].price
                  ).toFixed(2)
                : "-.--"}
            </div>
          </div>
        </div>

        {/* Bids (Buy orders) */}
        <div className="flex-1">
          <h4 className="text-sm font-medium text-green-400 mb-2">Bids</h4>
          <div className="space-y-0.5">
            {displayOrderBook.bids.slice(0, 8).map((level, index) => (
              <div
                key={index}
                className="flex justify-between text-sm order-book-ask py-1 px-2 rounded"
              >
                <span className="text-green-400 font-mono">
                  ${formatPrice(level.price)}
                </span>
                <span className="text-gray-300 font-mono">
                  {formatQuantity(level.quantity)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
