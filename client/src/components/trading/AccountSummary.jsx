import { useTrading } from "../../contexts/TradingContext";
import LoadingSpinner from "../ui/LoadingSpinner";
import { memo, useMemo } from "react";
import { useNavigate } from "react-router-dom";

// Create a single formatter instance outside component to avoid recreating
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function AccountSummary() {
  const { accountSummary, loading } = useTrading();
  const navigate = useNavigate();

  const formattedData = useMemo(() => {
    if (!accountSummary) return null;

    return {
      balance: currencyFormatter.format(accountSummary.balance),
      availableBalance: currencyFormatter.format(
        accountSummary.available_balance
      ),
      marginUsed: currencyFormatter.format(accountSummary.margin_used),
      unrealizedPnl: currencyFormatter.format(accountSummary.unrealized_pnl),
      totalEquity: currencyFormatter.format(accountSummary.total_equity),
      pnlColor:
        accountSummary.unrealized_pnl >= 0 ? "text-green-500" : "text-red-500",
      marginRatio: parseFloat(accountSummary.margin_ratio || 0).toFixed(2),
    };
  }, [accountSummary]);

  if (loading || !formattedData) {
    return (
      <div className="trading-panel">
        <h3 className="text-lg font-semibold mb-4">Account Summary</h3>
        <LoadingSpinner size="sm" text="Loading account..." />
      </div>
    );
  }

  return (
    <div className="trading-panel max-w-full">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-base font-semibold">Account Summary</h3>
        <button
          onClick={() => navigate("/profile")}
          className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
          title="View Full Profile"
        >
          <span>Profile</span>
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Balance:</span>
          <span className="font-medium">{formattedData.balance}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Available:</span>
          <span className="font-medium">{formattedData.availableBalance}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Margin Used:</span>
          <span className="font-medium">{formattedData.marginUsed}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Unrealized PnL:</span>
          <span className={`font-medium ${formattedData.pnlColor}`}>
            {formattedData.unrealizedPnl}
          </span>
        </div>

        <hr className="border-gray-600 my-2" />

        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Total Equity:</span>
          <span className="font-bold">{formattedData.totalEquity}</span>
        </div>

        {accountSummary && accountSummary.margin_used > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Margin Ratio:</span>
            <span
              className={`font-medium ${
                accountSummary.margin_ratio > 5
                  ? "text-green-500"
                  : accountSummary.margin_ratio > 2
                  ? "text-yellow-500"
                  : "text-red-500"
              }`}
            >
              {formattedData.marginRatio}x
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize the component with custom comparison to prevent unnecessary re-renders
const MemoizedAccountSummary = memo(AccountSummary, (prevProps, nextProps) => {
  // Since this component has no props, it should only re-render when context changes
  // The memo will handle this automatically, but we can add custom logic if needed
  return false; // Let memo handle the optimization
});

export default MemoizedAccountSummary;
