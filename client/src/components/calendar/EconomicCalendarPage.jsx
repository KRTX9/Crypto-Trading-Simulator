import { useState, useEffect, useRef } from "react";
import Header from "../trading/Header";

export default function EconomicCalendarPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImportance, setSelectedImportance] = useState("all");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const containerRef = useRef(null);
  const widgetId = useRef(
    `economic_calendar_${Math.random().toString(36).substr(2, 9)}`
  );

  // Importance levels
  const importanceLevels = [
    { value: "all", label: "All Events" },
    { value: "high", label: "High Impact" },
    { value: "medium", label: "Medium Impact" },
    { value: "low", label: "Low Impact" },
  ];

  // Countries/Regions
  const countries = [
    { value: "all", label: "All Countries" },
    { value: "US", label: "United States" },
    { value: "EU", label: "European Union" },
    { value: "GB", label: "United Kingdom" },
    { value: "JP", label: "Japan" },
    { value: "CN", label: "China" },
    { value: "CA", label: "Canada" },
    { value: "AU", label: "Australia" },
    { value: "CH", label: "Switzerland" },
  ];

  // Create TradingView Economic Calendar widget
  const createWidget = () => {
    if (!containerRef.current) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Generate new widget ID
      widgetId.current = `economic_calendar_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      // Clear previous widget
      containerRef.current.innerHTML = "";

      // Create widget container
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container";
      widgetContainer.style.height = "600px";
      widgetContainer.style.width = "100%";

      // Create widget content div
      const widgetContent = document.createElement("div");
      widgetContent.className = "tradingview-widget-container__widget";
      widgetContent.style.height = "calc(600px - 32px)";
      widgetContent.style.width = "100%";

      // Create copyright div
      const copyrightDiv = document.createElement("div");
      copyrightDiv.className = "tradingview-widget-copyright";
      copyrightDiv.innerHTML =
        '<a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank"><span class="blue-text">Track all markets on TradingView</span></a>';

      // Create script element
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.src =
        "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
      script.async = true;

      // Widget configuration
      const config = {
        colorTheme: "dark",
        isTransparent: false,
        width: "100%",
        height: "600",
        locale: "en",
        importanceFilter: getImportanceFilter(),
        countryFilter: getCountryFilter(),
      };

      script.innerHTML = JSON.stringify(config);

      // Append elements
      widgetContainer.appendChild(widgetContent);
      widgetContainer.appendChild(copyrightDiv);
      widgetContainer.appendChild(script);
      containerRef.current.appendChild(widgetContainer);

      // Set loading to false after a delay
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } catch (err) {
      console.error("Error creating Economic Calendar widget:", err);
      setError("Failed to create Economic Calendar widget");
      setLoading(false);
      showFallbackContent();
    }
  };

  const getImportanceFilter = () => {
    switch (selectedImportance) {
      case "high":
        return "1";
      case "medium":
        return "0";
      case "low":
        return "-1";
      default:
        return "-1,0,1";
    }
  };

  const getCountryFilter = () => {
    if (selectedCountry === "all") {
      return "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu";
    }
    return selectedCountry.toLowerCase();
  };

  // Show fallback content when widget fails
  const showFallbackContent = () => {
    if (containerRef.current) {
      containerRef.current.innerHTML = `
        <div class="flex items-center justify-center h-[600px] bg-gray-800 rounded border border-gray-600">
          <div class="text-center">
            <div class="text-4xl mb-4">📅</div>
            <h3 class="text-lg font-medium text-gray-300 mb-2">Economic Calendar Unavailable</h3>
            <p class="text-sm text-gray-400 mb-4">Unable to load TradingView Economic Calendar</p>
            <div class="space-y-2 text-xs text-gray-500">
              <div>• Check your internet connection</div>
              <div>• Try refreshing the page</div>
              <div>• Economic events will be available shortly</div>
            </div>
          </div>
        </div>
      `;
    }
  };

  // Create widget when component mounts or filters change
  useEffect(() => {
    const timer = setTimeout(createWidget, 100);
    return () => clearTimeout(timer);
  }, [selectedImportance, selectedCountry]);

  const handleRefresh = () => {
    createWidget();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      <div className="p-4">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold neon-text terminal-text mb-2">
            📅 ECONOMIC CALENDAR
          </h1>
          <p className="text-gray-400 terminal-text">
            Stay informed with upcoming economic events and market-moving
            announcements
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 cyber-panel p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold neon-text-cyan terminal-text">
              Filter Events
            </h2>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="text-xs cyber-button px-2 py-1 disabled:opacity-50"
              title="Refresh calendar"
            >
              🔄
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Importance Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Event Importance
              </label>
              <select
                value={selectedImportance}
                onChange={(e) => setSelectedImportance(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
              >
                {importanceLevels.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Country Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Country/Region
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:border-neon-cyan focus:outline-none"
              >
                {countries.map((country) => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded text-red-400 text-sm">
            {error}
            <button
              onClick={handleRefresh}
              className="ml-2 underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Economic Calendar Widget */}
        <div className="cyber-panel p-6">
          <h2 className="text-lg font-semibold neon-text-cyan terminal-text mb-4">
            Upcoming Economic Events
          </h2>

          <div className="relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 rounded z-10">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-cyan mx-auto mb-2"></div>
                  <div className="text-sm text-gray-400">
                    Loading Economic Calendar...
                  </div>
                </div>
              </div>
            )}

            <div
              ref={containerRef}
              className="min-h-[600px] bg-gray-800 rounded border border-gray-600"
            >
              <div className="flex items-center justify-center h-[600px]">
                <div className="text-center">
                  <div className="text-4xl mb-2">📅</div>
                  <p className="text-gray-400">Loading Economic Calendar...</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information Cards */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold neon-text terminal-text mb-4">
            Economic Event Impact Guide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="cyber-panel p-4">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                <h3 className="text-sm font-medium neon-text-cyan terminal-text">
                  High Impact
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Major economic releases that typically cause significant market
                volatility. Examples: NFP, FOMC decisions, GDP releases.
              </p>
            </div>
            <div className="cyber-panel p-4">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                <h3 className="text-sm font-medium neon-text-cyan terminal-text">
                  Medium Impact
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Moderate economic indicators that can influence market
                direction. Examples: Retail sales, inflation data, employment
                reports.
              </p>
            </div>
            <div className="cyber-panel p-4">
              <div className="flex items-center mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <h3 className="text-sm font-medium neon-text-cyan terminal-text">
                  Low Impact
                </h3>
              </div>
              <p className="text-xs text-gray-400">
                Minor economic releases with limited market impact. Examples:
                Housing data, consumer confidence, manufacturing indices.
              </p>
            </div>
          </div>
        </div>

        {/* Trading Tips */}
        <div className="mt-6 cyber-panel p-4">
          <h3 className="text-lg font-semibold neon-text-cyan terminal-text mb-3">
            💡 Trading Tips for Economic Events
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <h4 className="font-medium text-gray-300 mb-2">Before Events:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Review consensus forecasts vs previous data</li>
                <li>• Check market positioning and sentiment</li>
                <li>• Set appropriate stop losses and position sizes</li>
                <li>• Monitor related currency pairs and assets</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-300 mb-2">During Events:</h4>
              <ul className="space-y-1 text-xs">
                <li>• Watch for immediate price reactions</li>
                <li>• Be prepared for increased volatility</li>
                <li>• Consider widening spreads during news</li>
                <li>• Avoid overtrading in volatile conditions</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
