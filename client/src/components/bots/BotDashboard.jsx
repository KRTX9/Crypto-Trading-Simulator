import { useState, useEffect } from 'react';
import { getAllBots, deleteBot } from '../../services/botService';
import Header from '../trading/Header';
import BotCreator from './BotCreator';
import BotList from './BotList';
import BotPerformance from './BotPerformance';

const BotDashboard = () => {
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);
  const [showPerformance, setShowPerformance] = useState(false);

  useEffect(() => {
    fetchBots();
  }, []);

  const fetchBots = async () => {
    try {
      setLoading(true);
      const data = await getAllBots();
      setBots(data);
      setError(null);
    } catch (err) {
      setError('Failed to load bots: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBotCreated = (newBot) => {
    setBots([...bots, newBot]);
    setShowCreator(false);
  };

  const handleBotUpdated = (updatedBot) => {
    setBots(bots.map(bot => bot.id === updatedBot.id ? updatedBot : bot));
    setSelectedBot(null);
    setShowCreator(false);
  };

  const handleDeleteBot = async (botId) => {
    if (!confirm('Are you sure you want to delete this bot?')) return;
    
    try {
      await deleteBot(botId);
      setBots(bots.filter(bot => bot.id !== botId));
    } catch (err) {
      alert('Failed to delete bot: ' + err.message);
    }
  };

  const handleViewPerformance = (bot) => {
    setSelectedBot(bot);
    setShowPerformance(true);
  };

  const handleEditBot = (bot) => {
    setSelectedBot(bot);
    setShowCreator(true);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">AI Trading Bots</h1>
          <p className="text-gray-400 mt-1">Automated strategy testing and execution</p>
        </div>
        <button
          onClick={() => {
            setSelectedBot(null);
            setShowCreator(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
        >
          + Create Bot
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Bot Creator Modal */}
      {showCreator && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <BotCreator
              bot={selectedBot}
              onBotCreated={handleBotCreated}
              onBotUpdated={handleBotUpdated}
              onClose={() => {
                setShowCreator(false);
                setSelectedBot(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Bot Performance Modal */}
      {showPerformance && selectedBot && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">
                  {selectedBot.name} - Performance
                </h2>
                <button
                  onClick={() => {
                    setShowPerformance(false);
                    setSelectedBot(null);
                  }}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              <BotPerformance bot={selectedBot} />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
            <div className="text-xl text-gray-400">Loading bots...</div>
          </div>
        </div>
      ) : (
        <>
          {/* Bot List */}
          <BotList
            bots={bots}
            onBotUpdated={(updatedBot) => {
              setBots(bots.map(bot => bot.id === updatedBot.id ? updatedBot : bot));
            }}
            onDeleteBot={handleDeleteBot}
            onViewPerformance={handleViewPerformance}
            onEditBot={handleEditBot}
          />

          {/* Empty State */}
          {bots.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-semibold text-white mb-2">No Bots Yet</h3>
          <p className="text-gray-400 mb-6">
            Create your first AI trading bot to start automated strategy testing
          </p>
          <button
            onClick={() => setShowCreator(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Create Your First Bot
          </button>
        </div>
      )}
        </>
      )}
      </div>
    </div>
  );
};

export default BotDashboard;
