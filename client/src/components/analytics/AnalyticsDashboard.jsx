import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { getAccountAnalytics, getBotAnalytics } from '../../services/botService';
import Header from '../trading/Header';

const AnalyticsDashboard = () => {
  const [accountAnalytics, setAccountAnalytics] = useState(null);
  const [botAnalytics, setBotAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('7d');

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [accountData, botData] = await Promise.all([
        getAccountAnalytics(timeframe),
        getBotAnalytics()
      ]);
      setAccountAnalytics(accountData || {});
      setBotAnalytics(Array.isArray(botData) ? botData : []);
      setError(null);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError('Failed to load analytics: ' + err.message);
      // Set empty defaults on error so the page can still render
      setAccountAnalytics({});
      setBotAnalytics([]);
    } finally {
      setLoading(false);
    }
  };

  // Show error only if it's a real error (not just empty data)
  const hasRealError = error && !error.includes('404');

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Prepare equity curve data
  const equityCurveData = accountAnalytics?.equity_curve || [];

  // Prepare bot comparison data
  const botComparisonData = botAnalytics.map(bot => ({
    name: bot.bot_name,
    totalPnL: parseFloat(bot.total_pnl || 0),
    winRate: parseFloat(bot.win_rate || 0),
    sharpeRatio: parseFloat(bot.sharpe_ratio || 0),
    trades: bot.total_trades || 0
  }));

  // Prepare trade distribution by strategy
  const strategyDistribution = botAnalytics.reduce((acc, bot) => {
    const strategy = bot.strategy_type || 'Unknown';
    const existing = acc.find(item => item.name === strategy);
    if (existing) {
      existing.value += bot.total_trades || 0;
    } else {
      acc.push({ name: strategy, value: bot.total_trades || 0 });
    }
    return acc;
  }, []);

  // Calculate overall metrics
  const totalTrades = accountAnalytics?.total_trades || 0;
  const winRate = accountAnalytics?.win_rate || 0;
  const totalPnL = parseFloat(accountAnalytics?.total_pnl || 0);
  const sharpeRatio = parseFloat(accountAnalytics?.sharpe_ratio || 0);
  const maxDrawdown = parseFloat(accountAnalytics?.max_drawdown || 0);
  const profitFactor = parseFloat(accountAnalytics?.profit_factor || 0);
  
  // Check if we have any data to show
  const hasData = totalTrades > 0 || botAnalytics.length > 0;

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
          <p className="text-gray-400 mt-1">Comprehensive trading performance insights</p>
        </div>
        
        {/* Timeframe selector */}
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d', 'all'].map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeframe === period
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period === '24h' ? '24H' : period === 'all' ? 'All Time' : period.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {hasRealError && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-8">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-xl text-gray-400">Loading analytics...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Empty State */}
          {!hasData && (
            <div className="text-center py-16 bg-gray-800 rounded-lg mb-8">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Trading Data Yet</h3>
              <p className="text-gray-400 mb-6">
                Start trading or create a bot to see performance analytics
              </p>
            </div>
          )}

          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <MetricCard
          title="Total P&L"
          value={`$${totalPnL.toFixed(2)}`}
          change={totalPnL >= 0 ? '+' : '-'}
          isPositive={totalPnL >= 0}
          icon="💰"
        />
        <MetricCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          subtitle={`${accountAnalytics?.winning_trades || 0} / ${totalTrades}`}
          icon="🎯"
        />
        <MetricCard
          title="Total Trades"
          value={totalTrades}
          subtitle="Executed"
          icon="📊"
        />
        <MetricCard
          title="Sharpe Ratio"
          value={sharpeRatio.toFixed(2)}
          subtitle="Risk-adjusted return"
          icon="📈"
        />
        <MetricCard
          title="Max Drawdown"
          value={`${maxDrawdown.toFixed(2)}%`}
          isPositive={false}
          icon="⚠️"
        />
        <MetricCard
          title="Profit Factor"
          value={profitFactor.toFixed(2)}
          subtitle="Profit / Loss ratio"
          icon="🔢"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Equity Curve */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Equity Curve</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={equityCurveData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="equity"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Account Equity"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bot P&L Comparison */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Bot P&L Comparison</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={botComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Bar dataKey="totalPnL" fill="#3b82f6" name="Total P&L ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Win Rate by Bot */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Win Rate by Bot</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={botComparisonData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#f3f4f6' }}
              />
              <Legend />
              <Bar dataKey="winRate" fill="#10b981" name="Win Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strategy Distribution */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">Strategy Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={strategyDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {strategyDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bot Performance Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Detailed Bot Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-4 py-3 text-gray-400 font-medium">Bot Name</th>
                <th className="px-4 py-3 text-gray-400 font-medium">Strategy</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Trades</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Win Rate</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Total P&L</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Avg P&L</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Sharpe</th>
                <th className="px-4 py-3 text-gray-400 font-medium text-right">Max DD</th>
              </tr>
            </thead>
            <tbody>
              {botAnalytics.map((bot, index) => (
                <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white font-medium">{bot.bot_name}</td>
                  <td className="px-4 py-3 text-gray-300">
                    <span className="px-2 py-1 bg-gray-700 rounded text-xs">
                      {bot.strategy_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right">{bot.total_trades || 0}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      parseFloat(bot.win_rate) >= 50 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {parseFloat(bot.win_rate || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      parseFloat(bot.total_pnl) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${parseFloat(bot.total_pnl || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${
                      parseFloat(bot.avg_pnl) >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      ${parseFloat(bot.avg_pnl || 0).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300 text-right">
                    {parseFloat(bot.sharpe_ratio || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-red-400 text-right">
                    {parseFloat(bot.max_drawdown || 0).toFixed(2)}%
                  </td>
                </tr>
              ))}
              {botAnalytics.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-gray-400">
                    No bot performance data available yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Metrics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Risk Metrics</h3>
          <div className="space-y-3">
            <RiskMetricRow
              label="Value at Risk (95%)"
              value={`$${accountAnalytics?.value_at_risk?.toFixed(2) || '0.00'}`}
            />
            <RiskMetricRow
              label="Sortino Ratio"
              value={accountAnalytics?.sortino_ratio?.toFixed(2) || '0.00'}
            />
            <RiskMetricRow
              label="Calmar Ratio"
              value={accountAnalytics?.calmar_ratio?.toFixed(2) || '0.00'}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">Trading Metrics</h3>
          <div className="space-y-3">
            <RiskMetricRow
              label="Avg Win"
              value={`$${accountAnalytics?.avg_win?.toFixed(2) || '0.00'}`}
              isPositive={true}
            />
            <RiskMetricRow
              label="Avg Loss"
              value={`$${Math.abs(accountAnalytics?.avg_loss || 0).toFixed(2)}`}
              isPositive={false}
            />
            <RiskMetricRow
              label="Best Trade"
              value={`$${accountAnalytics?.best_trade?.toFixed(2) || '0.00'}`}
              isPositive={true}
            />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4">System Performance</h3>
          <div className="space-y-3">
            <RiskMetricRow
              label="Active Bots"
              value={botAnalytics.filter(bot => bot.status === 'running').length}
            />
            <RiskMetricRow
              label="Total Strategies"
              value={new Set(botAnalytics.map(bot => bot.strategy_type)).size}
            />
            <RiskMetricRow
              label="Avg Trades/Bot"
              value={(botAnalytics.reduce((sum, bot) => sum + (bot.total_trades || 0), 0) / (botAnalytics.length || 1)).toFixed(1)}
            />
          </div>
        </div>
      </div>
        </>
      )}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, change, isPositive, icon }) => (
  <div className="bg-gray-800 rounded-lg p-6">
    <div className="flex items-center justify-between mb-2">
      <span className="text-gray-400 text-sm font-medium">{title}</span>
      {icon && <span className="text-2xl">{icon}</span>}
    </div>
    <div className="flex items-baseline gap-2">
      <span className={`text-2xl font-bold ${
        isPositive === undefined ? 'text-white' :
        isPositive ? 'text-green-400' : 'text-red-400'
      }`}>
        {value}
      </span>
      {change && (
        <span className={`text-sm font-medium ${
          isPositive ? 'text-green-400' : 'text-red-400'
        }`}>
          {change}
        </span>
      )}
    </div>
    {subtitle && (
      <span className="text-gray-500 text-sm mt-1 block">{subtitle}</span>
    )}
  </div>
);

// Risk Metric Row Component
const RiskMetricRow = ({ label, value, isPositive }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className={`font-medium ${
      isPositive === undefined ? 'text-white' :
      isPositive ? 'text-green-400' : 'text-red-400'
    }`}>
      {value}
    </span>
  </div>
);

export default AnalyticsDashboard;
