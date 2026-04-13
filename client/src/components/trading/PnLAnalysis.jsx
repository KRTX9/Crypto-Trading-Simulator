import { useTrading } from "../../contexts/TradingContext";

export default function PnLAnalysis() {
  const { trades } = useTrading();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  // Get trades with realized PnL for display
  const getClosedPositions = () => {
    if (!trades || trades.length === 0) return [];

    const tradesWithPnL = trades.filter((trade) => {
      const realizedPnL = parseFloat(trade.realized_pnl || 0);
      return realizedPnL !== 0; // Only show trades with actual PnL
    });

    // If no trades have PnL, show all trades for debugging
    const tradesToShow = tradesWithPnL.length > 0 ? tradesWithPnL : trades;

    return tradesToShow.map((trade) => {
      const realizedPnL = parseFloat(trade.realized_pnl || 0);
      const entryPrice = parseFloat(trade.price || 0);
      const quantity = parseFloat(trade.quantity || 0);
      const commission = parseFloat(trade.commission || 0);
      const leverage = parseFloat(trade.leverage || 10); // Default leverage

      // Calculate entry value and margin
      const entryValue = entryPrice * quantity;
      const margin = entryValue / leverage;

      // Net PnL = Realized PnL - Commission (if commission not already deducted)
      const netPnL = realizedPnL - commission;

      // ROI = (Net PnL / Margin) * 100
      // This gives the return on the actual capital invested (margin)
      const roi = margin > 0 ? (netPnL / margin) * 100 : 0;

      return {
        id: trade.id,
        symbol: trade.symbol,
        side: trade.side === "BUY" ? "LONG" : "SHORT",
        size: quantity,
        entry_price: entryPrice,
        realized_pnl: realizedPnL,
        commission: commission,
        net_pnl: netPnL,
        roi: roi,
        created_at: trade.created_at,
        status: realizedPnL !== 0 ? "CLOSED" : "EXECUTED",
      };
    });
  };

  const closedPositions = getClosedPositions();

  // Show loading state
  if (!trades) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">⏳</div>
        <p>Loading trading data...</p>
      </div>
    );
  }

  // Show empty state
  if (closedPositions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No trading data available</p>
        <p className="text-sm text-gray-500">
          {!trades
            ? "Loading trades..."
            : trades.length === 0
            ? "No trades found"
            : "No trades with realized PnL found"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Symbol
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Side
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Status
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Size
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Exit Price
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Realized PnL
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Commission
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Net PnL
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              ROI%
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400">
              Time
            </th>
          </tr>
        </thead>
        <tbody>
          {closedPositions.map((position) => {
            const sideColor =
              position.side === "LONG" ? "text-green-500" : "text-red-500";
            const pnlColor =
              position.realized_pnl >= 0 ? "text-green-500" : "text-red-500";
            const netPnlColor =
              position.net_pnl >= 0 ? "text-green-500" : "text-red-500";
            const roiColor =
              position.roi >= 0 ? "text-green-500" : "text-red-500";

            return (
              <tr
                key={position.id}
                className="border-b border-gray-700 hover:bg-gray-800"
              >
                <td className="py-2 px-2 font-medium">{position.symbol}</td>
                <td className={`py-2 px-2 font-medium ${sideColor}`}>
                  {position.side}
                </td>
                <td className="py-2 px-2 font-medium text-gray-500">CLOSED</td>
                <td className="py-2 px-2">{position.size.toFixed(6)}</td>
                <td className="py-2 px-2 font-mono">
                  ${position.entry_price.toFixed(4)}
                </td>
                <td className={`py-2 px-2 font-bold font-mono ${pnlColor}`}>
                  {formatCurrency(position.realized_pnl)}
                </td>
                <td className="py-2 px-2 font-mono text-red-400">
                  -{formatCurrency(position.commission)}
                </td>
                <td className={`py-2 px-2 font-bold font-mono ${netPnlColor}`}>
                  {formatCurrency(position.net_pnl)}
                </td>
                <td className={`py-2 px-2 font-medium ${roiColor}`}>
                  {formatPercentage(position.roi)}
                </td>
                <td className="py-2 px-2 text-xs text-gray-400">
                  {position.created_at
                    ? new Date(position.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary Stats */}
      <div className="mt-4 p-3 bg-gray-700 rounded">
        <h4 className="text-sm font-medium text-gray-300 mb-2">PnL Summary</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Total Trades:</span>
            <span className="ml-2 font-medium">{closedPositions.length}</span>
          </div>
          <div>
            <span className="text-gray-400">Total Realized PnL:</span>
            <span
              className={`ml-2 font-medium ${
                closedPositions.reduce(
                  (sum, pos) => sum + pos.realized_pnl,
                  0
                ) >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {formatCurrency(
                closedPositions.reduce((sum, pos) => sum + pos.realized_pnl, 0)
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Total Fees:</span>
            <span className="ml-2 font-medium text-red-400">
              -
              {formatCurrency(
                closedPositions.reduce((sum, pos) => sum + pos.commission, 0)
              )}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Net PnL:</span>
            <span
              className={`ml-2 font-bold ${
                closedPositions.reduce((sum, pos) => sum + pos.net_pnl, 0) >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {formatCurrency(
                closedPositions.reduce((sum, pos) => sum + pos.net_pnl, 0)
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
