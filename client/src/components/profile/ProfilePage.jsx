import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTrading } from "../../contexts/TradingContext";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const { user } = useAuth();
  const { accountSummary, positions, trades, orders } = useTrading();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  // Calculate comprehensive statistics
  const statistics = useMemo(() => {
    if (!trades || !accountSummary) return null;

    const realizedTrades = trades.filter(
      (trade) => parseFloat(trade.realized_pnl || 0) !== 0
    );
    const totalTrades = realizedTrades.length;
    const winningTrades = realizedTrades.filter(
      (trade) => parseFloat(trade.realized_pnl || 0) > 0
    );
    const losingTrades = realizedTrades.filter(
      (trade) => parseFloat(trade.realized_pnl || 0) < 0
    );

    const totalRealizedPnL = realizedTrades.reduce(
      (sum, trade) => sum + parseFloat(trade.realized_pnl || 0),
      0
    );
    const totalCommissions = trades.reduce(
      (sum, trade) => sum + parseFloat(trade.commission || 0),
      0
    );
    const netPnL = totalRealizedPnL - totalCommissions;

    const winRate =
      totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    const avgWin =
      winningTrades.length > 0
        ? winningTrades.reduce(
            (sum, trade) => sum + parseFloat(trade.realized_pnl || 0),
            0
          ) / winningTrades.length
        : 0;
    const avgLoss =
      losingTrades.length > 0
        ? Math.abs(
            losingTrades.reduce(
              (sum, trade) => sum + parseFloat(trade.realized_pnl || 0),
              0
            ) / losingTrades.length
          )
        : 0;

    const profitFactor = avgLoss > 0 ? Math.abs(avgWin / avgLoss) : 0;

    // Current positions stats
    const openPositions = positions?.length || 0;
    const totalUnrealizedPnL =
      positions?.reduce(
        (sum, pos) => sum + parseFloat(pos.unrealized_pnl || 0),
        0
      ) || 0;
    const totalMarginUsed =
      positions?.reduce((sum, pos) => sum + parseFloat(pos.margin || 0), 0) ||
      0;

    return {
      totalTrades,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate,
      totalRealizedPnL,
      totalCommissions,
      netPnL,
      avgWin,
      avgLoss,
      profitFactor,
      openPositions,
      totalUnrealizedPnL,
      totalMarginUsed,
    };
  }, [trades, positions, accountSummary]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value) => {
    const numValue = parseFloat(value || 0);
    return `${numValue >= 0 ? "+" : ""}${numValue.toFixed(2)}%`;
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: "📊" },
    { id: "positions", label: "Positions", icon: "📈" },
    { id: "trades", label: "Trade History", icon: "📋" },
    { id: "orders", label: "Order History", icon: "📝" },
    { id: "statistics", label: "Statistics", icon: "📈" },
  ];

  return (
    <div className="min-h-screen bg-terminal-bg text-neon-green-soft">
      {/* Cyberpunk Header */}
      <div className="cyber-panel border-b-2 border-neon-green px-6 py-4 cyber-glow">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate("/")}
              className="cyber-button p-2 rounded-lg transition-all hover:shadow-neon-green"
              title="Back to Trading Terminal"
            >
              <svg
                className="w-6 h-6 neon-text"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="w-12 h-12 bg-gradient-to-br from-neon-green to-neon-cyan rounded-full flex items-center justify-center border border-neon-green shadow-neon-green">
              <span className="text-xl font-bold text-terminal-bg">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold neon-text terminal-text">
                ⚡ ACCOUNT PROFILE ⚡
              </h1>
              <p className="neon-text-cyan terminal-text">{user?.email}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm neon-text-cyan terminal-text">
              ACCOUNT BALANCE
            </div>
            <div className="text-2xl font-bold neon-text terminal-text">
              {formatCurrency(accountSummary?.balance || 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Cyberpunk Navigation Tabs */}
      <div className="cyber-panel border-b border-neon-green">
        <div className="px-6">
          <nav className="flex space-x-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-3 border-b-2 font-medium text-sm flex items-center space-x-2 terminal-text transition-all ${
                  activeTab === tab.id
                    ? "border-neon-cyan text-neon-cyan shadow-neon-cyan"
                    : "border-transparent neon-text hover:neon-text-cyan hover:border-neon-green"
                }`}
              >
                <span className="text-lg">{tab.icon}</span>
                <span className="uppercase tracking-wide">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Cyberpunk Content */}
      <div className="p-6 bg-terminal-bg">
        {activeTab === "overview" && (
          <OverviewTab
            accountSummary={accountSummary}
            statistics={statistics}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        )}
        {activeTab === "positions" && (
          <PositionsTab
            positions={positions}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        )}
        {activeTab === "trades" && (
          <TradesTab
            trades={trades}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        )}
        {activeTab === "orders" && (
          <OrdersTab orders={orders} formatCurrency={formatCurrency} />
        )}
        {activeTab === "statistics" && (
          <StatisticsTab
            statistics={statistics}
            formatCurrency={formatCurrency}
            formatPercentage={formatPercentage}
          />
        )}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  accountSummary,
  statistics,
  formatCurrency,
  formatPercentage,
}) {
  if (!accountSummary || !statistics) {
    return (
      <div className="text-center py-8 neon-text-cyan terminal-text">
        <div className="animate-pulse">⚡ LOADING ACCOUNT DATA ⚡</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cyberpunk Account Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="cyber-panel p-6">
          <div className="neon-text-cyan text-sm mb-2 terminal-text uppercase tracking-wide">
            Total Balance
          </div>
          <div className="text-2xl font-bold neon-text terminal-text">
            {formatCurrency(accountSummary.balance)}
          </div>
        </div>

        <div className="cyber-panel p-6">
          <div className="neon-text-cyan text-sm mb-2 terminal-text uppercase tracking-wide">
            Available Balance
          </div>
          <div className="text-2xl font-bold neon-text terminal-text">
            {formatCurrency(accountSummary.available_balance)}
          </div>
        </div>

        <div className="cyber-panel p-6">
          <div className="neon-text-cyan text-sm mb-2 terminal-text uppercase tracking-wide">
            Margin Used
          </div>
          <div className="text-2xl font-bold neon-text-pink terminal-text">
            {formatCurrency(accountSummary.margin_used)}
          </div>
        </div>

        <div className="cyber-panel p-6">
          <div className="neon-text-cyan text-sm mb-2 terminal-text uppercase tracking-wide">
            Unrealized PnL
          </div>
          <div
            className={`text-2xl font-bold terminal-text ${
              accountSummary.unrealized_pnl >= 0
                ? "neon-text"
                : "neon-text-pink"
            }`}
          >
            {formatCurrency(accountSummary.unrealized_pnl)}
          </div>
        </div>
      </div>

      {/* Trading Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Trading Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Trades:</span>
              <span className="font-medium">{statistics.totalTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Win Rate:</span>
              <span
                className={`font-medium ${
                  statistics.winRate >= 50 ? "text-green-500" : "text-red-500"
                }`}
              >
                {statistics.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Realized PnL:</span>
              <span
                className={`font-medium ${
                  statistics.totalRealizedPnL >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {formatCurrency(statistics.totalRealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Net PnL:</span>
              <span
                className={`font-medium ${
                  statistics.netPnL >= 0 ? "text-green-500" : "text-red-500"
                }`}
              >
                {formatCurrency(statistics.netPnL)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">Current Positions</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Open Positions:</span>
              <span className="font-medium">{statistics.openPositions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Margin Used:</span>
              <span className="font-medium text-orange-500">
                {formatCurrency(statistics.totalMarginUsed)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Unrealized PnL:</span>
              <span
                className={`font-medium ${
                  statistics.totalUnrealizedPnL >= 0
                    ? "text-green-500"
                    : "text-red-500"
                }`}
              >
                {formatCurrency(statistics.totalUnrealizedPnL)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Margin Ratio:</span>
              <span className="font-medium">
                {parseFloat(accountSummary.margin_ratio || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Positions Tab Component
function PositionsTab({ positions, formatCurrency, formatPercentage }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📊</div>
        <p>No open positions</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Symbol
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Side
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Size
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Entry Price
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Mark Price
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                PnL
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Margin
              </th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => {
              const pnlColor =
                position.unrealized_pnl >= 0
                  ? "text-green-500"
                  : "text-red-500";
              const sideColor =
                position.side === "LONG" ? "text-green-500" : "text-red-500";

              return (
                <tr
                  key={position.id}
                  className="border-b border-gray-700 hover:bg-gray-750"
                >
                  <td className="py-3 px-4 font-medium">{position.symbol}</td>
                  <td className={`py-3 px-4 font-medium ${sideColor}`}>
                    {position.side}
                  </td>
                  <td className="py-3 px-4">
                    {parseFloat(position.size).toFixed(6)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    ${parseFloat(position.entry_price).toFixed(4)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    ${parseFloat(position.mark_price || 0).toFixed(4)}
                  </td>
                  <td className={`py-3 px-4 font-bold ${pnlColor}`}>
                    {formatCurrency(position.unrealized_pnl || 0)}
                  </td>
                  <td className="py-3 px-4">
                    {formatCurrency(position.margin)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Trades Tab Component
function TradesTab({ trades, formatCurrency, formatPercentage }) {
  if (!trades || trades.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📋</div>
        <p>No trade history</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Time
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Symbol
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Side
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Size
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Price
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Realized PnL
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Commission
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const pnlColor =
                parseFloat(trade.realized_pnl || 0) >= 0
                  ? "text-green-500"
                  : "text-red-500";
              const sideColor =
                trade.side === "BUY" ? "text-green-500" : "text-red-500";

              return (
                <tr
                  key={trade.id}
                  className="border-b border-gray-700 hover:bg-gray-750"
                >
                  <td className="py-3 px-4 text-xs text-gray-400">
                    {new Date(trade.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                  <td className={`py-3 px-4 font-medium ${sideColor}`}>
                    {trade.side}
                  </td>
                  <td className="py-3 px-4">
                    {parseFloat(trade.quantity).toFixed(6)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    ${parseFloat(trade.price).toFixed(4)}
                  </td>
                  <td className={`py-3 px-4 font-bold ${pnlColor}`}>
                    {formatCurrency(trade.realized_pnl || 0)}
                  </td>
                  <td className="py-3 px-4 text-red-400">
                    -{formatCurrency(trade.commission || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Orders Tab Component
function OrdersTab({ orders, formatCurrency }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-4xl mb-2">📝</div>
        <p>No order history</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-700">
            <tr>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Time
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Symbol
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Type
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Side
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Size
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Price
              </th>
              <th className="text-left py-3 px-4 font-medium text-gray-300">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const sideColor =
                order.side === "BUY" ? "text-green-500" : "text-red-500";
              const statusColor =
                order.status === "FILLED"
                  ? "text-green-500"
                  : order.status === "CANCELLED"
                  ? "text-red-500"
                  : "text-yellow-500";

              return (
                <tr
                  key={order.id}
                  className="border-b border-gray-700 hover:bg-gray-750"
                >
                  <td className="py-3 px-4 text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-medium">{order.symbol}</td>
                  <td className="py-3 px-4">{order.type}</td>
                  <td className={`py-3 px-4 font-medium ${sideColor}`}>
                    {order.side}
                  </td>
                  <td className="py-3 px-4">
                    {parseFloat(order.quantity).toFixed(6)}
                  </td>
                  <td className="py-3 px-4 font-mono">
                    {order.price
                      ? `$${parseFloat(order.price).toFixed(4)}`
                      : "Market"}
                  </td>
                  <td className={`py-3 px-4 font-medium ${statusColor}`}>
                    {order.status}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Statistics Tab Component
function StatisticsTab({ statistics, formatCurrency, formatPercentage }) {
  if (!statistics) {
    return (
      <div className="text-center py-8 text-gray-400">
        Loading statistics...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Trading Statistics</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Trades:</span>
            <span className="font-medium">{statistics.totalTrades}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Winning Trades:</span>
            <span className="font-medium text-green-500">
              {statistics.winningTrades}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Losing Trades:</span>
            <span className="font-medium text-red-500">
              {statistics.losingTrades}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Win Rate:</span>
            <span
              className={`font-medium ${
                statistics.winRate >= 50 ? "text-green-500" : "text-red-500"
              }`}
            >
              {statistics.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Average Win:</span>
            <span className="font-medium text-green-500">
              {formatCurrency(statistics.avgWin)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Average Loss:</span>
            <span className="font-medium text-red-500">
              -{formatCurrency(statistics.avgLoss)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Profit Factor:</span>
            <span
              className={`font-medium ${
                statistics.profitFactor >= 1 ? "text-green-500" : "text-red-500"
              }`}
            >
              {statistics.profitFactor.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-400">Total Realized PnL:</span>
            <span
              className={`font-medium ${
                statistics.totalRealizedPnL >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {formatCurrency(statistics.totalRealizedPnL)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Commissions:</span>
            <span className="font-medium text-red-400">
              -{formatCurrency(statistics.totalCommissions)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Net PnL:</span>
            <span
              className={`font-bold text-lg ${
                statistics.netPnL >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {formatCurrency(statistics.netPnL)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Current Unrealized PnL:</span>
            <span
              className={`font-medium ${
                statistics.totalUnrealizedPnL >= 0
                  ? "text-green-500"
                  : "text-red-500"
              }`}
            >
              {formatCurrency(statistics.totalUnrealizedPnL)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Open Positions:</span>
            <span className="font-medium">{statistics.openPositions}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin Used:</span>
            <span className="font-medium text-orange-500">
              {formatCurrency(statistics.totalMarginUsed)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
