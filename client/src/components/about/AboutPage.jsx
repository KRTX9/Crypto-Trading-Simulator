import { useState } from "react";
import { Link } from "react-router-dom";

export default function AboutPage() {
  const [hoveredSocial, setHoveredSocial] = useState(null);

  const socialLinks = [
    {
      name: "Twitter",
      url: "https://x.com/k9txs",
      icon: "🐦",
      color: "hover:text-blue-400 hover:border-blue-400",
    },
    {
      name: "Discord",
      url: "https://discord.gg/k9tx",
      icon: "💬",
      color: "hover:text-purple-400 hover:border-purple-400",
    },
    {
      name: "Telegram",
      url: "https://t.me/k9tx_official",
      icon: "✈️",
      color: "hover:text-blue-300 hover:border-blue-300",
    },
    {
      name: "GitHub",
      url: "https://github.com/k9tx",
      icon: "⚡",
      color: "hover:text-gray-300 hover:border-gray-300",
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/k9tx",
      icon: "💼",
      color: "hover:text-blue-600 hover:border-blue-600",
    },
    {
      name: "Email",
      url: "mailto:contact@k9tx.exchange",
      icon: "📧",
      color: "hover:text-green-400 hover:border-green-400",
    },
  ];

  const features = [
    {
      title: "Real-Time Market Data",
      description: "Live cryptocurrency price feeds and market analysis tools",
      icon: "📊",
    },
    {
      title: "Risk-Free Trading",
      description: "Practice trading strategies without financial risk",
      icon: "🛡️",
    },
    {
      title: "Advanced Analytics",
      description: "Comprehensive P&L tracking and performance metrics",
      icon: "📈",
    },
    {
      title: "Multiple Markets",
      description: "Access to various cryptocurrency trading pairs",
      icon: "🔄",
    },
    {
      title: "Educational Tools",
      description: "Learn trading concepts with guided tutorials",
      icon: "🎓",
    },
    {
      title: "Community Support",
      description: "Connect with fellow traders and share strategies",
      icon: "👥",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className="cyber-panel border-b border-neon-green border-opacity-30 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-bold neon-text terminal-text hover:text-neon-cyan transition-colors"
          >
            ⚡ KRTX9 EXCHANGE ⚡
          </Link>
          <div className="flex space-x-4">
            <Link
              to="/"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              [DASHBOARD]
            </Link>
            <Link
              to="/profile"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              [PROFILE]
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h1 className="text-6xl font-bold mb-4 neon-text terminal-text animate-pulse">
              KRTX9 EXCHANGE
            </h1>
            <div className="text-2xl mb-6 neon-text-cyan terminal-text">
              FUTURE TRADING SIMULATOR
            </div>
            <p className="text-lg neon-text terminal-text max-w-2xl mx-auto leading-relaxed">
              Experience the thrill of cryptocurrency futures trading in a
              completely risk-free environment. Master your trading strategies,
              analyze market patterns, and become a proficient trader without
              putting real money at stake.
            </p>
          </div>

          <div className="flex justify-center space-x-4 mb-12">
            <div className="cyber-panel p-4 border border-neon-green border-opacity-50">
              <div className="text-2xl font-bold neon-text-green terminal-text">
                10K+
              </div>
              <div className="text-sm neon-text terminal-text">
                Active Traders
              </div>
            </div>
            <div className="cyber-panel p-4 border border-neon-cyan border-opacity-50">
              <div className="text-2xl font-bold neon-text-cyan terminal-text">
                99.9%
              </div>
              <div className="text-sm neon-text terminal-text">Uptime</div>
            </div>
            <div className="cyber-panel p-4 border border-neon-pink border-opacity-50">
              <div className="text-2xl font-bold neon-text-pink terminal-text">
                24/7
              </div>
              <div className="text-sm neon-text terminal-text">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 neon-text terminal-text">
            ⚡ PLATFORM FEATURES ⚡
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="cyber-panel p-6 border border-neon-green border-opacity-30 hover:border-neon-cyan hover:border-opacity-70 transition-all duration-300 hover:shadow-neon-cyan hover:scale-105"
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-3 neon-text terminal-text">
                  {feature.title}
                </h3>
                <p className="neon-text terminal-text opacity-80">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Company Info */}
      <section className="py-16 px-4 border-t border-neon-green border-opacity-30">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 neon-text terminal-text">
            ⚡ ABOUT KRTX9 EXCHANGE ⚡
          </h2>
          <div className="cyber-panel p-8 border border-neon-green border-opacity-50">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg neon-text terminal-text leading-relaxed mb-6">
                KRTX9 Exchange is a cutting-edge futures trading simulator
                designed to bridge the gap between theoretical knowledge and
                practical trading experience. Founded in 2024, we've built a
                platform that replicates real market conditions while
                maintaining a completely risk-free environment.
              </p>
              <p className="text-lg neon-text terminal-text leading-relaxed mb-6">
                Our mission is to democratize trading education by providing
                advanced tools, real-time market data, and comprehensive
                analytics that help traders of all levels improve their skills
                and build confidence before entering live markets.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                <div>
                  <h3 className="text-xl font-semibold mb-4 neon-text-cyan terminal-text">
                    🎯 Our Vision
                  </h3>
                  <p className="neon-text terminal-text opacity-90">
                    To become the leading platform for cryptocurrency trading
                    education, empowering the next generation of skilled traders
                    through innovative simulation technology.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-4 neon-text-cyan terminal-text">
                    🚀 Our Values
                  </h3>
                  <ul className="space-y-2 neon-text terminal-text opacity-90">
                    <li>• Education First</li>
                    <li>• Risk Management</li>
                    <li>• Community Driven</li>
                    <li>• Innovation & Excellence</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Links */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12 neon-text terminal-text">
            ⚡ CONNECT WITH US ⚡
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            {socialLinks.map((social, index) => (
              <a
                key={index}
                href={social.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`cyber-panel p-4 border border-neon-green border-opacity-50 transition-all duration-300 hover:scale-110 hover:shadow-neon-green ${social.color}`}
                onMouseEnter={() => setHoveredSocial(index)}
                onMouseLeave={() => setHoveredSocial(null)}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="text-2xl">{social.icon}</div>
                  <div className="text-sm font-semibold neon-text terminal-text">
                    {social.name}
                  </div>
                  {hoveredSocial === index && (
                    <div className="text-xs neon-text terminal-text opacity-70 animate-pulse">
                      [CLICK TO CONNECT]
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neon-green border-opacity-30 py-8 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-4">
            <div className="text-xl font-bold neon-text terminal-text">
              KRTX9 EXCHANGE
            </div>
            <div className="text-sm neon-text terminal-text opacity-70">
              Future Trading Simulator Platform
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mb-6 text-sm">
            <a
              href="#"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              Terms of Service
            </a>
            <a
              href="#"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              Help Center
            </a>
            <a
              href="#"
              className="neon-text terminal-text hover:text-neon-green transition-colors"
            >
              API Documentation
            </a>
          </div>
          <div className="text-xs neon-text terminal-text opacity-80">
            © 2024 KRTX9 Capital Management. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
