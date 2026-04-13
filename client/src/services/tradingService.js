import apiClient from "./apiClient";

const tradingService = {
  // Account management
  getAccountSummary: async () => {
    try {
      const response = await apiClient.get("/trading/account/");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  resetAccount: async () => {
    try {
      const response = await apiClient.post("/trading/account/reset/", {
        confirm: true,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Positions
  getPositions: async () => {
    try {
      const response = await apiClient.get("/trading/positions/");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  closePosition: async (positionId) => {
    try {
      const response = await apiClient.post("/trading/positions/close/", {
        position_id: positionId,
      });
      return response.data;
    } catch (error) {
      console.error("❌ ClosePosition API error:", error);
      throw error;
    }
  },

  setStopLoss: async (positionId, stopLoss) => {
    try {
      const response = await apiClient.post("/trading/positions/stop-loss/", {
        position_id: positionId,
        stop_loss: stopLoss,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  setTakeProfit: async (positionId, takeProfit) => {
    try {
      const response = await apiClient.post("/trading/positions/take-profit/", {
        position_id: positionId,
        take_profit: takeProfit,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Orders
  getOrders: async (limit = 50) => {
    try {
      const response = await apiClient.get(`/trading/orders/?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createOrder: async (orderData) => {
    try {
      const response = await apiClient.post(
        "/trading/orders/create/",
        orderData
      );
      return response.data;
    } catch (error) {
      console.error(
        "Trading service error:",
        JSON.stringify(error.response?.data, null, 2) || error.message
      );
      throw error;
    }
  },

  // Trades
  getTrades: async (limit = 50) => {
    try {
      const response = await apiClient.get(`/trading/trades/?limit=${limit}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // User settings
  getUserSettings: async () => {
    try {
      const response = await apiClient.get("/trading/settings/");
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateUserSettings: async (settings) => {
    try {
      const response = await apiClient.put("/trading/settings/", settings);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  cancelOrder: async (orderId) => {
    try {
      const response = await apiClient.delete(`/trading/orders/${orderId}/`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Market price updates
  updateMarketPrice: async (symbol, price) => {
    try {
      const response = await apiClient.post("/trading/market/update-price/", {
        symbol,
        price,
      });
      return response.data;
    } catch (error) {
      // Silently fail to prevent disrupting real-time updates
      console.warn(
        `Failed to update market price for ${symbol}:`,
        error.message
      );
      return null;
    }
  },
};

export default tradingService;
