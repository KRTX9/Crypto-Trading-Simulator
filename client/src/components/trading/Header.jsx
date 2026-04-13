import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useTrading } from "../../contexts/TradingContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function Header() {
  const { user, logout } = useAuth();
  const { resetAccount } = useTrading();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleResetAccount = async () => {
    if (
      confirm(
        "Are you sure you want to reset your account? This will close all positions and reset your balance to $50,000.",
      )
    ) {
      try {
        setIsResetting(true);
        await resetAccount();
        alert("Account reset successfully!");
      } catch (error) {
        alert("Failed to reset account: " + error.message);
      } finally {
        setIsResetting(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Navigation items with active state detection
  const navItems = [
    { path: "/", label: "DASHBOARD", icon: "📊" },
    { path: "/bots", label: "AI BOTS", icon: "🤖" },
    { path: "/analytics", label: "ANALYTICS", icon: "📉" },
    { path: "/market-analysis", label: "ANALYSIS", icon: "📈" },
    { path: "/economic-calendar", label: "CALENDAR", icon: "📅" },
    { path: "/profile", label: "PROFILE", icon: "👤" },
    { path: "/about", label: "ABOUT", icon: "ℹ️" },
  ];

  const isActivePath = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  return (
    <header className="cyber-panel border-b border-neon-green/30 px-3 py-2 cyber-glow bg-gray-900/95 backdrop-blur-sm">
      <div className="flex items-center justify-between max-w-full">
        {/* Left Section - Brand & Navigation */}
        <div className="flex items-center space-x-6">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center">
              <span className="text-lg font-bold neon-text terminal-text">
                ⚡ KRTX9
              </span>
              <span className="text-xs neon-text-cyan terminal-text ml-2 hidden sm:inline">
                TRADING TERMINAL
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-1 px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ${
                  isActivePath(item.path)
                    ? "bg-neon-cyan/20 border border-neon-cyan/50 text-neon-cyan shadow-sm"
                    : "text-gray-300 hover:text-neon-cyan hover:bg-neon-cyan/10 border border-transparent hover:border-neon-cyan/30"
                } terminal-text`}
              >
                <span className="text-xs">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Section - Actions & User */}
        <div className="flex items-center space-x-3">
          {/* Reset Account Button */}
          <button
            onClick={handleResetAccount}
            disabled={isResetting}
            className="hidden sm:flex items-center space-x-1 cyber-button px-3 py-1.5 text-xs rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-600/20 border-red-500/50"
            title="Reset trading account"
          >
            <span>🔄</span>
            <span className="hidden lg:inline">
              {isResetting ? "RESETTING..." : "RESET"}
            </span>
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 neon-text hover:neon-text-cyan transition-colors p-1 rounded hover:bg-neon-cyan/10"
            >
              <div className="w-7 h-7 bg-gradient-to-br from-neon-green to-neon-cyan rounded-full flex items-center justify-center border border-neon-green/50 shadow-sm">
                <span className="text-terminal-bg font-bold text-xs">
                  {user?.name?.charAt(0) || "U"}
                </span>
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-xs terminal-text font-medium">
                  {user?.name || "USER"}
                </span>
                <span className="text-xs text-gray-400 -mt-0.5">Trader</span>
              </div>
              <svg
                className="w-3 h-3 transition-transform duration-200 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                style={{
                  transform: showUserMenu ? "rotate(180deg)" : "rotate(0deg)",
                }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-52 cyber-panel shadow-lg shadow-neon-green/20 z-50 border border-neon-green/30">
                <div className="py-1">
                  {/* Mobile Navigation Items */}
                  <div className="md:hidden border-b border-gray-600 pb-2 mb-2">
                    {navItems.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          navigate(item.path);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-xs flex items-center space-x-2 transition-all terminal-text ${
                          isActivePath(item.path)
                            ? "text-neon-cyan bg-neon-cyan/10"
                            : "text-gray-300 hover:bg-neon-green/10 hover:text-neon-cyan"
                        }`}
                      >
                        <span>{item.icon}</span>
                        <span>{">> " + item.label}</span>
                      </button>
                    ))}
                    {/* Mobile Reset Button */}
                    <button
                      onClick={() => {
                        handleResetAccount();
                        setShowUserMenu(false);
                      }}
                      disabled={isResetting}
                      className="sm:hidden w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-all terminal-text disabled:opacity-50"
                    >
                      <span>
                        🔄{" "}
                        {">> " +
                          (isResetting ? "RESETTING..." : "RESET ACCOUNT")}
                      </span>
                    </button>
                  </div>

                  {/* User Menu Items - Account specific actions */}
                  <div className="px-4 py-2 text-xs text-gray-400 border-b border-gray-600">
                    Account Actions
                  </div>

                  <div className="border-t border-gray-600 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-xs neon-text hover:bg-neon-pink hover:bg-opacity-10 hover:neon-text-pink transition-all terminal-text flex items-center space-x-2"
                    >
                      <span>🚪</span>
                      <span>{">> SIGN OUT"}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
