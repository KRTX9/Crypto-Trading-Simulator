import React from "react";
import { useTrading } from "../../contexts/TradingContext";

function Orders() {
  const { orders, cancelOrder } = useTrading();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await cancelOrder(orderId);
    } catch (error) {
      console.error("Failed to cancel order:", error.message);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📋</div>
        <p>No orders</p>
        <p className="text-sm text-gray-500">
          Your order history will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Time
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Symbol
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Type
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Side
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Quantity
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Price
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Filled
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Status
            </th>
            <th className="text-left py-2 px-3 font-medium text-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const sideColor =
              order.side === "BUY" ? "text-green-500" : "text-red-500";
            const statusColor =
              {
                PENDING: "text-yellow-500",
                FILLED: "text-green-500",
                CANCELLED: "text-gray-500",
                REJECTED: "text-red-500",
              }[order.status] || "text-gray-400";

            return (
              <tr
                key={order.id}
                className="border-b border-gray-700 hover:bg-gray-800"
              >
                <td className="py-3 px-3 text-xs">
                  {formatDateTime(order.created_at)}
                </td>
                <td className="py-3 px-3 font-medium">{order.symbol}</td>
                <td className="py-3 px-3">{order.type}</td>
                <td className={`py-3 px-3 font-medium ${sideColor}`}>
                  {order.side}
                </td>
                <td className="py-3 px-3">
                  {parseFloat(order.quantity || 0).toFixed(3)}
                </td>
                <td className="py-3 px-3">
                  {order.price
                    ? `$${parseFloat(order.price).toFixed(2)}`
                    : "Market"}
                </td>
                <td className="py-3 px-3">
                  {parseFloat(order.filled_quantity || 0).toFixed(3)} /{" "}
                  {parseFloat(order.quantity || 0).toFixed(3)}
                </td>
                <td className={`py-3 px-3 font-medium ${statusColor}`}>
                  {order.status}
                </td>
                <td className="py-3 px-3">
                  {order.status === "PENDING" && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default React.memo(Orders);
