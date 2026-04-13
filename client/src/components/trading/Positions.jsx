import { useState } from "react";
import { useTrading } from "../../contexts/TradingContext";
import PositionManagement from "./PositionManagement";
import {
  formatPriceBySymbol,
  formatCurrency,
  formatQuantity,
  formatPercentage,
} from "../../utils/formatters";

export default function Positions() {
  const { positions, closePosition } = useTrading();
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const handleQuickClose = async (position) => {
    try {
      await closePosition(position.id);
      showMessage("Position closed successfully");
    } catch (error) {
      showMessage(`Failed to close position: ${error.message}`, "error");
    }
  };

  const showMessage = (msg, type = "success") => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(""), 3000);
  };

  const calculatePnlPercentage = (position) => {
    if (position.entry_price === 0) return 0;
    return (
      (position.unrealized_pnl / (position.size * position.entry_price)) * 100
    );
  };

  if (positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No open positions</p>
        <p className="text-sm text-gray-500">
          Your positions will appear here when you open trades
        </p>
      </div>
    );
  }

  return (
    <div>
      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            messageType === "error"
              ? "bg-red-500 bg-opacity-10 border border-red-500 text-red-500"
              : "bg-green-500 bg-opacity-10 border border-green-500 text-green-500"
          }`}
        >
          {message}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-auto">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                Symbol
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[50px]">
                Side
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[70px]">
                Size
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                Entry
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                Mark
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[50px]">
                Lev
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[90px]">
                SL/TP
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[70px]">
                Margin
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                PnL
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[60px]">
                PnL%
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[80px]">
                Liq.
              </th>
              <th className="text-left py-2 px-2 font-medium text-gray-400 min-w-[120px]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const pnlPercentage = calculatePnlPercentage(position);
              const pnlColor =
                position.unrealized_pnl >= 0
                  ? "text-green-500"
                  : "text-red-500";
              const sideColor =
                position.side === "LONG" || position.side === "Long"
                  ? "text-green-500"
                  : "text-red-500";

              return (
                <tr
                  key={position.id}
                  className="border-b border-gray-700 hover:bg-gray-800"
                >
                  <td className="py-2 px-2 font-medium text-sm">
                    {position.symbol}
                  </td>
                  <td className={`py-2 px-2 font-medium text-sm ${sideColor}`}>
                    {position.side}
                  </td>
                  <td className="py-2 px-2 text-sm">
                    {formatQuantity(position.size, position.symbol)}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono">
                    $
                    {formatPriceBySymbol(position.entry_price, position.symbol)}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono">
                    ${formatPriceBySymbol(position.mark_price, position.symbol)}
                  </td>
                  <td className="py-2 px-2 text-sm">{position.leverage}x</td>
                  <td className="py-2 px-2 text-xs">
                    {position.stop_loss ? (
                      <div className="text-red-400 font-mono mb-1">
                        SL: $
                        {formatPriceBySymbol(
                          position.stop_loss,
                          position.symbol
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500 mb-1">SL: -</div>
                    )}
                    {position.take_profit ? (
                      <div className="text-green-400 font-mono">
                        TP: $
                        {formatPriceBySymbol(
                          position.take_profit,
                          position.symbol
                        )}
                      </div>
                    ) : (
                      <div className="text-gray-500">TP: -</div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono">
                    {formatCurrency(position.margin, { compact: true })}
                  </td>
                  <td
                    className={`py-2 px-2 font-medium text-sm font-mono ${pnlColor}`}
                  >
                    {formatCurrency(position.unrealized_pnl)}
                  </td>
                  <td className={`py-2 px-2 font-medium text-sm ${pnlColor}`}>
                    {formatPercentage(pnlPercentage)}
                  </td>
                  <td className="py-2 px-2 text-sm font-mono">
                    {formatCurrency(position.liquidation_price, {
                      compact: true,
                    })}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleQuickClose(position)}
                        className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded"
                        title="Quick Close"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => setSelectedPosition(position)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                        title="Manage Position (SL/TP)"
                      >
                        TP/SL
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Position Management Modal */}
      {selectedPosition && (
        <PositionManagement
          position={selectedPosition}
          onClose={() => setSelectedPosition(null)}
          onAction={showMessage}
        />
      )}
    </div>
  );
}
