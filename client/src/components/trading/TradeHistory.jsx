import { useTrading } from "../../contexts/TradingContext";
import {
  formatPriceBySymbol,
  formatCurrency,
  formatQuantity,
} from "../../utils/formatters";

export default function TradeHistory() {
  const { trades } = useTrading();

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No trade history</p>
        <p className="text-sm text-gray-500">
          Your executed trades will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm table-auto">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[100px]">
              Time
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
              Symbol
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[50px]">
              Side
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[70px]">
              Quantity
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
              Price
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[60px]">
              Fee Rate
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[70px]">
              Trading Fee
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
              Realized PnL
            </th>
            <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[90px]">
              Transaction ID
            </th>
          </tr>
        </thead>
        <tbody>
          {trades
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort by newest first
            .map((trade) => {
              const sideColor =
                trade.side === "BUY" ? "text-green-500" : "text-red-500";
              const pnlColor =
                trade.realized_pnl >= 0 ? "text-green-500" : "text-red-500";
              const tradeValue = trade.quantity * trade.price;

              return (
                <tr
                  key={trade.id}
                  className="border-b border-gray-700 hover:bg-gray-800"
                >
                  <td className="py-2 px-2 text-xs font-mono">
                    {formatDateTime(trade.created_at)}
                  </td>
                  <td className="py-2 px-2 font-medium text-sm">
                    {trade.symbol}
                  </td>
                  <td className={`py-2 px-2 font-medium text-sm ${sideColor}`}>
                    {trade.side}
                  </td>
                  <td className="py-2 px-2 text-sm">
                    {formatQuantity(trade.quantity, trade.symbol)}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono">
                    ${formatPriceBySymbol(trade.price, trade.symbol)}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono text-yellow-400">
                    {trade.fee_rate_percent
                      ? `${trade.fee_rate_percent.toFixed(3)}%`
                      : "0.055%"}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono text-red-400">
                    ${parseFloat(trade.commission || 0).toFixed(8)}
                  </td>
                  <td className={`py-2 px-2 text-sm font-mono ${pnlColor}`}>
                    {trade.realized_pnl !== 0
                      ? formatCurrency(trade.realized_pnl)
                      : "-"}
                  </td>
                  <td className="py-2 px-2 text-xs font-mono text-cyan-400">
                    {trade.transaction_id || trade.order_id.slice(-8)}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>

      {/* Summary Stats */}
      {trades.length > 0 && (
        <div className="mt-4 p-3 bg-gray-700 rounded">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Total Trades:</span>
              <span className="ml-2 font-medium">{trades.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Fees:</span>
              <span className="ml-2 font-medium text-red-400">
                {formatCurrency(
                  trades.reduce((sum, trade) => sum + trade.commission, 0)
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Realized PnL:</span>
              <span
                className={`ml-2 font-medium ${
                  trades.reduce((sum, trade) => sum + trade.realized_pnl, 0) >=
                  0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {formatCurrency(
                  trades.reduce((sum, trade) => sum + trade.realized_pnl, 0)
                )}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Volume:</span>
              <span className="ml-2 font-medium">
                {formatCurrency(
                  trades.reduce(
                    (sum, trade) => sum + trade.quantity * trade.price,
                    0
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
