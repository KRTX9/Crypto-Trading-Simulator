import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { getAnalyticsDashboard, getRiskMetrics, getComparisonAnalytics } from '../../services/botService';

const PerformanceDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    fetchAllData();
  }, [timeRange]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [analyticsData, riskData, comparisonData] = await Promise.all([
        getAnalyticsDashboard(timeRange),
        getRiskMetrics(),
        getComparisonAnalytics()
      ]);
      setAnalytics(analyticsData);
      setRiskMetrics(riskData);
      setComparison(comparisonData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-xl text-white">Loading analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">No analytics data available</p>
      </div>
    );
  }

  const accountAnalytics = analytics.account_analytics;
  const COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b'];

  // Format daily P&L data for chart
  const dailyPnLData = accountAnalytics.daily_pnl?.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    pnl: day.pnl,
    trades: day.trades_count
  })) || [];

  // Risk level color
  const getRiskColor = (level) => {
    const colors = {
      LOW: 'text-green-400',
      MEDIUM: 'text-yellow-400',
      HIGH: 'text-orange-400',
      CRITICAL: 'text-red-400'
    };
    return colors[level] || 'text-gray-400';
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Performance Analytics</h1>
          <p className="text-gray-400 mt-1">Comprehensive trading performance overview</p>
        </div>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(parseInt(e.target.value))}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        >
          <option value={7}>Last 7 Days</option>
          <option value={30}>Last 30 Days</option>
          <option value={90}>Last 90 Days</option>
        </select>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Total P&L</div>
          <div className={`text-3xl font-bold ${accountAnalytics.net_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${accountAnalytics.net_pnl?.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Commission: ${accountAnalytics.total_commission?.toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Win Rate</div>
          <div className="text-3xl font-bold text-white">
            {accountAnalytics.win_rate?.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {accountAnalytics.winning_trades}/{accountAnalytics.total_trades} winning
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">ROI</div>
          <div className={`text-3xl font-bold ${accountAnalytics.roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {accountAnalytics.roi?.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            On initial capital
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">Sharpe Ratio</div>
          <div className="text-3xl font-bold text-white">
            {accountAnalytics.sharpe_ratio?.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Risk-adjusted return
          </div>
        </div>
      </div>

      {/* Daily P&L Chart */}
      {dailyPnLData.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">Daily P&L</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyPnLData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend />
              <Line type="monotone" dataKey="pnl" stroke="#10b981" strokeWidth={2} name="P&L ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Risk Metrics */}
        {riskMetrics && (
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold text-white mb-4">Risk Metrics</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Risk Level</span>
                <span className={`font-semibold text-lg ${getRiskColor(riskMetrics.risk_level)}`}>
                  {riskMetrics.risk_level}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Margin Ratio</span>
                <span className="font-semibold text-white">{riskMetrics.margin_ratio?.toFixed(2)}%</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Open Positions</span>
                <span className="font-semibold text-white">{riskMetrics.open_positions_count}</span>
              </div>
              
              <div className="flex justify-between items-center py-3 border-b border-gray-700">
                <span className="text-gray-400">Unrealized P&L</span>
                <span className={`font-semibold ${riskMetrics.total_unrealized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${riskMetrics.total_unrealized_pnl?.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between items-center py-3">
                <span className="text-gray-400">Available Balance</span>
                <span className="font-semibold text-white">${riskMetrics.available_balance?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Performance Breakdown */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Performance Breakdown</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Profit Factor</span>
              <span className="font-semibold text-white">{accountAnalytics.profit_factor?.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Max Drawdown</span>
              <span className="font-semibold text-red-400">{accountAnalytics.max_drawdown?.toFixed(2)}%</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Avg Win</span>
              <span className="font-semibold text-green-400">${accountAnalytics.average_win?.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3 border-b border-gray-700">
              <span className="text-gray-400">Avg Loss</span>
              <span className="font-semibold text-red-400">${accountAnalytics.average_loss?.toFixed(2)}</span>
            </div>
            
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400">Total Trades</span>
              <span className="font-semibold text-white">{accountAnalytics.total_trades}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manual vs Bot Comparison */}
      {comparison && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-6">Manual vs Bot Trading</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-3">Manual Trading</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Trades</span>
                  <span className="text-white font-semibold">{comparison.manual_trading.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">P&L</span>
                  <span className={`font-semibold ${comparison.manual_trading.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${comparison.manual_trading.total_pnl?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Win Rate</span>
                  <span className="text-white font-semibold">{comparison.manual_trading.win_rate?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-3">Bot Trading</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Trades</span>
                  <span className="text-white font-semibold">{comparison.bot_trading.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">P&L</span>
                  <span className={`font-semibold ${comparison.bot_trading.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${comparison.bot_trading.total_pnl?.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Win Rate</span>
                  <span className="text-white font-semibold">{comparison.bot_trading.win_rate?.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-3">Combined</div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Total Trades</span>
                  <span className="text-white font-semibold">{comparison.combined.total_trades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Total P&L</span>
                  <span className={`font-semibold ${comparison.combined.total_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${comparison.combined.total_pnl?.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceDashboard;
