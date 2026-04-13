import { useState, useEffect } from 'react';
import {
  getAllCustomStrategies,
  uploadCustomStrategy,
  deleteCustomStrategy,
  getStrategyTemplate,
  validateStrategyCode,
  testCustomStrategy
} from '../../services/botService';

const CustomStrategyManager = ({ onClose, onStrategySelected }) => {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [strategyName, setStrategyName] = useState('');
  const [strategyCode, setStrategyCode] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetchStrategies();
  }, []);

  const fetchStrategies = async () => {
    try {
      setLoading(true);
      const data = await getAllCustomStrategies();
      setStrategies(data);
    } catch (err) {
      console.error('Failed to fetch strategies:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async () => {
    try {
      const data = await getStrategyTemplate();
      setStrategyCode(data.template);
      setShowEditor(true);
    } catch (err) {
      alert('Failed to load template: ' + err.message);
    }
  };

  const handleValidate = async () => {
    try {
      setValidationError(null);
      setValidationSuccess(false);
      await validateStrategyCode(strategyCode);
      setValidationSuccess(true);
    } catch (err) {
      setValidationError(err.response?.data?.error || err.message);
    }
  };

  const handleTest = async () => {
    if (!strategyName) {
      alert('Please save the strategy first before testing');
      return;
    }
    
    try {
      const result = await testCustomStrategy(strategyName);
      setTestResult(result);
    } catch (err) {
      alert('Test failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleUpload = async () => {
    if (!strategyName || !strategyCode) {
      alert('Strategy name and code are required');
      return;
    }

    try {
      setLoading(true);
      await uploadCustomStrategy(strategyName, strategyCode);
      alert('Strategy uploaded successfully!');
      setShowEditor(false);
      setStrategyName('');
      setStrategyCode('');
      setValidationError(null);
      setValidationSuccess(false);
      fetchStrategies();
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (strategy) => {
    if (!confirm(`Delete strategy "${strategy.name}"?`)) return;

    try {
      await deleteCustomStrategy(strategy.name);
      fetchStrategies();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleSelectStrategy = (strategy) => {
    if (onStrategySelected) {
      onStrategySelected(strategy.name);
    }
    onClose();
  };

  if (showEditor) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Editor Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white">Custom Strategy Editor</h2>
              <p className="text-gray-400 text-sm mt-1">Write your Python trading strategy</p>
            </div>
            <button
              onClick={() => {
                setShowEditor(false);
                setValidationError(null);
                setValidationSuccess(false);
                setTestResult(null);
              }}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Editor Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Strategy Name */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Strategy Name
              </label>
              <input
                type="text"
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="My Custom Strategy"
              />
            </div>

            {/* Code Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Python Code
              </label>
              <textarea
                value={strategyCode}
                onChange={(e) => setStrategyCode(e.target.value)}
                className="w-full h-96 bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
                placeholder="Paste your strategy code here..."
                spellCheck="false"
              />
            </div>

            {/* Validation Messages */}
            {validationError && (
              <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                <strong>Validation Error:</strong> {validationError}
              </div>
            )}

            {validationSuccess && (
              <div className="bg-green-900/50 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
                ✓ Strategy code is valid!
              </div>
            )}

            {/* Test Result */}
            {testResult && (
              <div className="bg-blue-900/50 border border-blue-500 text-blue-200 px-4 py-3 rounded-lg">
                <strong>Test Result:</strong>
                <div className="mt-2">
                  <div>Signal: <span className="font-bold">{testResult.signal || 'None'}</span></div>
                  <div>Reason: {testResult.reason}</div>
                  <div className="text-sm mt-1">Tested with {testResult.test_data_points} data points</div>
                </div>
              </div>
            )}
          </div>

          {/* Editor Footer */}
          <div className="flex gap-3 p-6 border-t border-gray-700">
            <button
              onClick={loadTemplate}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Load Template
            </button>
            <button
              onClick={handleValidate}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-semibold transition-colors"
            >
              Validate Code
            </button>
            <button
              onClick={handleTest}
              disabled={!strategyName}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
            >
              Test Strategy
            </button>
            <button
              onClick={handleUpload}
              disabled={loading || !validationSuccess}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
            >
              {loading ? 'Uploading...' : 'Upload Strategy'}
            </button>
            <button
              onClick={() => {
                setShowEditor(false);
                setValidationError(null);
                setValidationSuccess(false);
              }}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Custom Strategies</h2>
              <p className="text-gray-400 mt-1">Manage your Python trading strategies</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => {
                setStrategyName('');
                setStrategyCode('');
                setShowEditor(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              + Create New Strategy
            </button>
            <button
              onClick={loadTemplate}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              📝 View Template
            </button>
          </div>

          {/* Strategies List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="text-xl text-gray-400">Loading strategies...</div>
            </div>
          ) : strategies.length === 0 ? (
            <div className="text-center py-16 bg-gray-700/30 rounded-lg">
              <div className="text-6xl mb-4">📜</div>
              <h3 className="text-xl font-semibold text-white mb-2">No Custom Strategies Yet</h3>
              <p className="text-gray-400 mb-6">
                Create your first custom Python trading strategy
              </p>
              <button
                onClick={() => {
                  setStrategyName('');
                  setStrategyCode('');
                  setShowEditor(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Get Started
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategies.map((strategy, index) => (
                <div
                  key={index}
                  className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{strategy.name}</h3>
                      <p className="text-sm text-gray-400">{strategy.filename}</p>
                    </div>
                    <div className="flex gap-2">
                      {onStrategySelected && (
                        <button
                          onClick={() => handleSelectStrategy(strategy)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                        >
                          Select
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(strategy)}
                        className="px-3 py-1 bg-red-600/50 hover:bg-red-600 text-white text-sm rounded transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Created: {new Date(strategy.created * 1000).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="mt-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-300 mb-2">ℹ️ Requirements</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Your strategy must have a class with <code className="bg-gray-800 px-1 rounded">generate_signal(data, params)</code> method</li>
              <li>• Return tuple: <code className="bg-gray-800 px-1 rounded">('BUY'/'SELL'/None, reason)</code></li>
              <li>• Data includes: OHLCV + technical indicators (RSI, MACD, Bollinger Bands, etc.)</li>
              <li>• File operations, system calls, and eval/exec are forbidden for security</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomStrategyManager;
