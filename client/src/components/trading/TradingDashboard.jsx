import { useState } from "react";
import { useTrading } from "../../contexts/TradingContext";
import { useAuth } from "../../contexts/AuthContext";
import Header from "./Header";
import MarketData from "./MarketData";
import Chart from "./Chart";
import OrderForm from "./OrderForm";
import OrderBook from "./OrderBook";
import Positions from "./Positions";
import Orders from "./Orders";
import TradeHistory from "./TradeHistory";
import PnLAnalysis from "./PnLAnalysis";
import AccountSummary from "./AccountSummary";
import LoadingSpinner from "../ui/LoadingSpinner";

export default function TradingDashboard() {
  const { user } = useAuth();
  const { loading, error } = useTrading();
  const [activeTab, setActiveTab] = useState("positions");

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading trading data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header />

      {error && (
        <div className="mx-4 mb-4 bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="p-4">
        {/* Top section: Market Data */}
        <div className="mb-4">
          <MarketData />
        </div>

        {/* Main trading interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 mb-6">
          {/* Left sidebar: Order Book */}
          <div className="lg:col-span-2">
            <div className="h-[550px] lg:h-[750px] overflow-hidden">
              <OrderBook />
            </div>
          </div>

          {/* Center: Chart - Maximum width */}
          <div className="lg:col-span-8">
            <div className="h-[550px] lg:h-[750px]">
              <Chart />
            </div>
          </div>

          {/* Right sidebar: Account Summary and Order Form */}
          <div className="lg:col-span-2 space-y-3">
            <AccountSummary />
            <OrderForm />
          </div>
        </div>

        {/* Bottom section: Positions, Orders, Trades */}
        <div className="w-full">
          <div className="trading-panel">
            <div className="flex space-x-6 mb-4 border-b border-gray-600">
              <button
                onClick={() => setActiveTab("positions")}
                className={`pb-2 px-2 font-medium text-sm transition-colors ${
                  activeTab === "positions"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Positions
              </button>
              <button
                onClick={() => setActiveTab("orders")}
                className={`pb-2 px-2 font-medium text-sm transition-colors ${
                  activeTab === "orders"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setActiveTab("trades")}
                className={`pb-2 px-2 font-medium text-sm transition-colors ${
                  activeTab === "trades"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                Trade History
              </button>
              <button
                onClick={() => setActiveTab("pnl")}
                className={`pb-2 px-2 font-medium text-sm transition-colors ${
                  activeTab === "pnl"
                    ? "text-blue-500 border-b-2 border-blue-500"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                PnL Analysis
              </button>
            </div>

            <div className="min-h-[200px] w-full">
              {activeTab === "positions" && <Positions />}
              {activeTab === "orders" && <Orders />}
              {activeTab === "trades" && <TradeHistory />}
              {activeTab === "pnl" && <PnLAnalysis />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
