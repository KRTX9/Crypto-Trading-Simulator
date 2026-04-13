import { useState } from 'react';
import { startBot, pauseBot, stopBot, executeBot } from '../../services/botService';

const BotList = ({ bots, onBotUpdated, onDeleteBot, onViewPerformance, onEditBot }) => {
  const [controllingBot, setControllingBot] = useState(null);

  const handleControl = async (botId, action, actionFn) => {
    setControllingBot(botId);
    try {
      const result = await actionFn(botId);
      
      // Check if the result indicates an error
      if (result.success === false || result.error) {
        alert(`Failed to ${action} bot: ${result.error || result.message || 'Unknown error'}`);
        return;
      }
      
      // Show success message for execute action
      if (action === 'execute' && result.action) {
        alert(`Bot executed: ${result.action}\n${result.reason || ''}`);
      }
      
      if (result.bot) {
        onBotUpdated(result.bot);
      }
    } catch (err) {
      console.error(`Bot ${action} error:`, err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message;
      alert(`Failed to ${action} bot: ${errorMsg}`);
    } finally {
      setControllingBot(null);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500',
      PAUSED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
      STOPPED: 'bg-gray-500/20 text-gray-400 border-gray-500'
    };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getStrategyColor = (strategy) => {
    const colors = {
      SMA_CROSSOVER: 'bg-blue-500/10 text-blue-400',
      RSI: 'bg-purple-500/10 text-purple-400',
      MACD: 'bg-green-500/10 text-green-400',
      BOLLINGER_BANDS: 'bg-orange-500/10 text-orange-400',
      MOMENTUM: 'bg-red-500/10 text-red-400',
      MEAN_REVERSION: 'bg-pink-500/10 text-pink-400'
    };
    return colors[strategy] || 'bg-gray-500/10 text-gray-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {bots.map(bot => (
        <div key={bot.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-colors">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">{bot.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getStrategyColor(bot.strategy)}`}>
                  {bot.strategy.replace(/_/g, ' ')}
                </span>
                <span className="text-gray-400 text-sm">{bot.symbol}</span>
              </div>
            </div>
            {getStatusBadge(bot.status)}
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4 py-4 border-y border-gray-700">
            <div>
              <div className="text-gray-400 text-xs mb-1">Total P&L</div>
              <div className={`font-semibold ${parseFloat(bot.total_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                ${parseFloat(bot.total_pnl || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Win Rate</div>
              <div className="font-semibold text-white">
                {parseFloat(bot.win_rate || 0).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-gray-400 text-xs mb-1">Trades</div>
              <div className="font-semibold text-white">{bot.total_trades || 0}</div>
            </div>
          </div>

          {/* Settings */}
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <div className="text-gray-400">Position: <span className="text-white">{bot.max_position_size}</span></div>
            <div className="text-gray-400">Leverage: <span className="text-white">{bot.leverage}x</span></div>
          </div>

          {/* Control Buttons */}
          <div className="space-y-2">
            {/* Start/Pause/Stop */}
            <div className="flex gap-2">
              {bot.status !== 'ACTIVE' && (
                <button
                  onClick={() => handleControl(bot.id, 'start', startBot)}
                  disabled={controllingBot === bot.id}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold text-sm transition-colors"
                >
                  ▶ Start
                </button>
              )}
              
              {bot.status === 'ACTIVE' && (
                <button
                  onClick={() => handleControl(bot.id, 'pause', pauseBot)}
                  disabled={controllingBot === bot.id}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold text-sm transition-colors"
                >
                  ⏸ Pause
                </button>
              )}
              
              {bot.status !== 'STOPPED' && (
                <button
                  onClick={() => handleControl(bot.id, 'stop', stopBot)}
                  disabled={controllingBot === bot.id}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold text-sm transition-colors"
                >
                  ⏹ Stop
                </button>
              )}

              <button
                onClick={() => handleControl(bot.id, 'execute', executeBot)}
                disabled={controllingBot === bot.id}
                className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white py-2 rounded font-semibold text-sm transition-colors"
                title="Execute strategy once"
              >
                🎯 Execute
              </button>
            </div>

            {/* View/Edit/Delete */}
            <div className="flex gap-2">
              <button
                onClick={() => onViewPerformance(bot)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold text-sm transition-colors"
              >
                📊 Performance
              </button>
              
              <button
                onClick={() => onEditBot(bot)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-semibold text-sm transition-colors"
              >
                ✏️ Edit
              </button>
              
              <button
                onClick={() => onDeleteBot(bot.id)}
                disabled={bot.status === 'ACTIVE'}
                className="flex-1 bg-red-600/50 hover:bg-red-600 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded font-semibold text-sm transition-colors"
                title={bot.status === 'ACTIVE' ? 'Stop bot first' : 'Delete bot'}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Last Executed */}
          {bot.last_executed_at && (
            <div className="text-xs text-gray-500 mt-3 text-center">
              Last executed: {new Date(bot.last_executed_at).toLocaleString()}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default BotList;
