import apiClient from "./apiClient";

// Bot Management
export const getAllBots = async () => {
  const response = await apiClient.get("/trading/bots/");
  return response.data;
};

export const createBot = async (botData) => {
  const response = await apiClient.post("/trading/bots/", botData);
  return response.data;
};

export const getBotDetails = async (botId) => {
  const response = await apiClient.get(`/trading/bots/${botId}/`);
  return response.data;
};

export const updateBot = async (botId, updateData) => {
  const response = await apiClient.patch(`/trading/bots/${botId}/`, updateData);
  return response.data;
};

export const deleteBot = async (botId) => {
  const response = await apiClient.delete(`/trading/bots/${botId}/`);
  return response.data;
};

// Bot Control
export const startBot = async (botId) => {
  const response = await apiClient.post(`/trading/bots/${botId}/start/`, {});
  return response.data;
};

export const pauseBot = async (botId) => {
  const response = await apiClient.post(`/trading/bots/${botId}/pause/`, {});
  return response.data;
};

export const stopBot = async (botId) => {
  const response = await apiClient.post(`/trading/bots/${botId}/stop/`, {});
  return response.data;
};

export const executeBot = async (botId) => {
  const response = await apiClient.post(`/trading/bots/${botId}/execute/`, {});
  return response.data;
};

// Bot Trades and Performance
export const getBotTrades = async (botId) => {
  const response = await apiClient.get(`/trading/bots/${botId}/trades/`);
  return response.data;
};

export const getBotPerformance = async (botId) => {
  const response = await apiClient.get(`/trading/bots/${botId}/performance/`);
  return response.data;
};

// Strategies
export const getAllStrategies = async () => {
  const response = await apiClient.get("/trading/strategies/");
  return response.data;
};

// Backtesting
export const runBacktest = async (backtestData) => {
  const response = await apiClient.post("/trading/backtest/", backtestData);
  return response.data;
};

// Analytics
export const getAnalyticsDashboard = async (days = 30) => {
  const response = await apiClient.get(
    `/trading/analytics/dashboard/?days=${days}`
  );
  return response.data;
};

// Account Analytics - converts timeframe to days parameter
export const getAccountAnalytics = async (timeframe = "7d") => {
  const timeframeMap = {
    "24h": 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
    all: 365 * 10, // 10 years for "all time"
  };
  const days = timeframeMap[timeframe] || 7;
  const response = await apiClient.get(
    `/trading/analytics/dashboard/?days=${days}`
  );
  return response.data;
};

// Bot Analytics - gets comparison data for all bots
export const getBotAnalytics = async () => {
  const response = await apiClient.get("/trading/analytics/comparison/");
  return response.data;
};

export const getRiskMetrics = async () => {
  const response = await apiClient.get("/trading/analytics/risk/");
  return response.data;
};

export const getComparisonAnalytics = async () => {
  const response = await apiClient.get("/trading/analytics/comparison/");
  return response.data;
};

// Custom Strategies
export const uploadCustomStrategy = async (name, code) => {
  const response = await apiClient.post("/trading/custom-strategies/upload/", {
    name,
    code,
  });
  return response.data;
};

export const getAllCustomStrategies = async () => {
  const response = await apiClient.get("/trading/custom-strategies/");
  return response.data;
};

export const deleteCustomStrategy = async (strategyName) => {
  const response = await apiClient.delete(
    `/trading/custom-strategies/${strategyName}/`
  );
  return response.data;
};

export const getStrategyTemplate = async () => {
  const response = await apiClient.get("/trading/custom-strategies/template/");
  return response.data;
};

export const validateStrategyCode = async (code) => {
  const response = await apiClient.post(
    "/trading/custom-strategies/validate/",
    {
      code,
    }
  );
  return response.data;
};

export const testCustomStrategy = async (strategyName, parameters = {}) => {
  const response = await apiClient.post("/trading/custom-strategies/test/", {
    strategy_name: strategyName,
    parameters,
  });
  return response.data;
};

export default {
  getAllBots,
  createBot,
  getBotDetails,
  updateBot,
  deleteBot,
  startBot,
  pauseBot,
  stopBot,
  executeBot,
  getBotTrades,
  getBotPerformance,
  getAllStrategies,
  runBacktest,
  getAnalyticsDashboard,
  getAccountAnalytics,
  getBotAnalytics,
  getRiskMetrics,
  getComparisonAnalytics,
  uploadCustomStrategy,
  getAllCustomStrategies,
  deleteCustomStrategy,
  getStrategyTemplate,
  validateStrategyCode,
  testCustomStrategy,
};
