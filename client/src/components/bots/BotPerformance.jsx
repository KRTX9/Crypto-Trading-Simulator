import { useState, useEffect } from 'react';
import { getBotPerformance, getBotTrades } from '../../services/botService';

const BotPerformance = ({ bot }) => {
  const [performance, setPerformance] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [bot.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [perfData, tradesData] = await Promise.all([
        getBotPerformance(bot.id),
        getBotTrades(bot.id)
      ]);
      setPerformance(perfData);
      setTrades(tradesData);
    } catch (err) {
      console.error('Failed to fetch bot data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading performance data...</div>;
  }

  if (!performance) {
    return <div className="text-center py-8 text-gray-400">No performance data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Performance Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total P&L</div>
          <div className={`text-2xl font-bold ${parseFloat(performance.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${parseFloat(performance.total_pnl || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Win Rate</div>
          <div className="text-2xl font-bold text-white">
            {parseFloat(performance.win_rate || 0).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {performance.winning_trades || 0}/{performance.total_trades || 0} wins
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Avg P&L/Trade</div>
          <div className={`text-2xl font-bold ${parseFloat(performance.average_pnl_per_trade || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${parseFloat(performance.average_pnl_per_trade || 0).toFixed(2)}
          </div>
        </div>

        <div className="bg-gray-700/50 rounded-lg p-4">
          <div className="text-gray-400 text-sm mb-1">Total Trades</div>
          <div className="text-2xl font-bold text-white">
            {performance.total_trades}
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="bg-gray-700/50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">Risk Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-gray-400 text-sm mb-1">Sharpe Ratio</div>
            <div className="text-xl font-semibold text-white">
              {parseFloat(performance.sharpe_ratio || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-1">Max Drawdown</div>
            <div className="text-xl font-semibold text-red-400">
              {parseFloat(performance.max_drawdown || 0).toFixed(2)}%
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-1">Best Trade</div>
            <div className="text-xl font-semibold text-green-400">
              ${parseFloat(performance.best_trade || 0).toFixed(2)}
            </div>
          </div>

          <div>
            <div className="text-gray-400 text-sm mb-1">Worst Trade</div>
            <div className="text-xl font-semibold text-red-400">
              ${parseFloat(performance.worst_trade || 0).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Trades */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Recent Trades</h3>
        <div className="bg-gray-700/30 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Side</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Entry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Exit</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">P&L</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {trades.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-gray-400">
                      No trades yet
                    </td>
                  </tr>
                ) : (
                  trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(trade.entry_time).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          trade.side === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        ${parseFloat(trade.entry_price || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">
                        {trade.exit_price ? `$${parseFloat(trade.exit_price).toFixed(2)}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${
                          parseFloat(trade.realized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          ${parseFloat(trade.realized_pnl || 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {trade.duration ? `${trade.duration}m` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Trade Distribution */}
      {performance.total_trades > 0 && (
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Trade Distribution</h3>
          <div className="space-y-2">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400">Winning Trades</span>
                <span className="text-white">{performance.winning_trades}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${performance.win_rate}%` }}
                />
              </div>
            </div>
            
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-red-400">Losing Trades</span>
                <span className="text-white">{performance.losing_trades}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${100 - performance.win_rate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BotPerformance;
