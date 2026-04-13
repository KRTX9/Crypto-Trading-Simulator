// Market Analysis Service for alternative.me API integration
const API_BASE_URL = "/fng-api/fng/";

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
let fearGreedCache = {
  data: null,
  timestamp: null,
};

/**
 * Fetches Fear & Greed Index data from alternative.me API
 * @param {number} limit - Number of results to fetch (default: 1 for latest)
 * @param {string} format - Response format (default: 'json')
 * @returns {Promise<Object>} Fear & Greed Index data
 */
export const getFearGreedIndex = async (limit = 1, format = "json") => {
  try {
    // Check cache first
    if (fearGreedCache.data && fearGreedCache.timestamp) {
      const cacheAge = Date.now() - fearGreedCache.timestamp;
      if (cacheAge < CACHE_DURATION) {
        return fearGreedCache.data;
      }
    }

    const url = `${API_BASE_URL}?limit=${limit}&format=${format}`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (
      !data ||
      !data.data ||
      !Array.isArray(data.data) ||
      data.data.length === 0
    ) {
      throw new Error("Invalid response structure from alternative.me API");
    }

    // Transform the data to our expected format
    const transformedData = {
      value: parseInt(data.data[0].value),
      value_classification: data.data[0].value_classification,
      timestamp: data.data[0].timestamp,
      time_until_update: data.data[0].time_until_update || null,
      last_updated: new Date(
        parseInt(data.data[0].timestamp) * 1000
      ).toISOString(),
    };

    // Update cache
    fearGreedCache = {
      data: transformedData,
      timestamp: Date.now(),
    };

    return transformedData;
  } catch (error) {
    console.error("Error fetching Fear & Greed Index:", error);

    // Return cached data if available, even if expired
    if (fearGreedCache.data) {
      return {
        ...fearGreedCache.data,
        isStale: true,
        error: error.message,
      };
    }

    // Return mock data as fallback when API is unavailable
    return {
      value: 63,
      value_classification: "Greed",
      timestamp: Math.floor(Date.now() / 1000).toString(),
      time_until_update: null,
      last_updated: new Date().toISOString(),
      isMockData: true,
      error: "Using demo data - API temporarily unavailable",
    };
  }
};

/**
 * Gets historical Fear & Greed Index data
 * @param {number} days - Number of days of historical data (max 365)
 * @returns {Promise<Array>} Array of historical Fear & Greed Index data
 */
export const getHistoricalFearGreedIndex = async (days = 30) => {
  try {
    const limit = Math.min(days, 365); // API limit is 365 days
    const url = `${API_BASE_URL}?limit=${limit}&format=json`;

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || !data.data || !Array.isArray(data.data)) {
      throw new Error(
        "Invalid historical data structure from alternative.me API"
      );
    }

    // Transform historical data
    const historicalData = data.data.map((item) => ({
      value: parseInt(item.value),
      value_classification: item.value_classification,
      timestamp: item.timestamp,
      date: new Date(parseInt(item.timestamp) * 1000)
        .toISOString()
        .split("T")[0],
    }));

    return historicalData;
  } catch (error) {
    console.error("Error fetching historical Fear & Greed Index:", error);
    throw error;
  }
};

/**
 * Clears the Fear & Greed Index cache
 */
export const clearFearGreedCache = () => {
  fearGreedCache = {
    data: null,
    timestamp: null,
  };
};

/**
 * Gets the sentiment color based on Fear & Greed Index value
 * @param {number} value - Fear & Greed Index value (0-100)
 * @returns {string} Color class or hex color
 */
export const getSentimentColor = (value) => {
  if (value <= 25) return "#ef4444"; // Red - Extreme Fear/Fear
  if (value <= 45) return "#f97316"; // Orange - Fear
  if (value <= 55) return "#eab308"; // Yellow - Neutral
  if (value <= 75) return "#84cc16"; // Light Green - Greed
  return "#22c55e"; // Green - Extreme Greed
};

/**
 * Gets the sentiment label based on Fear & Greed Index value
 * @param {number} value - Fear & Greed Index value (0-100)
 * @returns {string} Sentiment label
 */
export const getSentimentLabel = (value) => {
  if (value <= 25) return "Extreme Fear";
  if (value <= 45) return "Fear";
  if (value <= 55) return "Neutral";
  if (value <= 75) return "Greed";
  return "Extreme Greed";
};

/**
 * Retry mechanism for API calls with exponential backoff
 * @param {Function} apiCall - The API call function to retry
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @param {number} baseDelay - Base delay in milliseconds (default: 1000)
 * @returns {Promise} Result of the API call
 */
export const retryApiCall = async (
  apiCall,
  maxRetries = 3,
  baseDelay = 1000
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        break;
      }

      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};

export default {
  getFearGreedIndex,
  getHistoricalFearGreedIndex,
  clearFearGreedCache,
  getSentimentColor,
  getSentimentLabel,
  retryApiCall,
};
