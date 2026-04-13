# 🚀 Cryptocurrency Trading Platform

A professional-grade, real-time cryptocurrency futures trading platform with Automated trading bots, advanced analytics, and comprehensive market analysis tools.

## ✨ Features

### 🎯 Core Trading Features
- **Real-time Market Data**: Live price updates via Binance WebSocket integration
- **Advanced Order Types**: Market orders, limit orders with customizable parameters
- **Leverage Trading**: Up to 125x leverage on futures contracts
- **Position Management**: Real-time P&L tracking, stop-loss, and take-profit automation
- **Order Book**: Live order book visualization with depth analysis
- **Trade History**: Comprehensive trade logging and history tracking

### 🤖 Automated Trading Bots
- **6 Built-in Strategies**:
  - SMA Crossover (Moving Average)
  - RSI (Relative Strength Index)
  - MACD (Moving Average Convergence Divergence)
  - Bollinger Bands
  - Momentum Strategy
  - Mean Reversion
- **Custom Strategy Support**: Upload and deploy your own Python trading strategies
- **Backtesting Engine**: Test strategies on historical data before deployment
- **Performance Analytics**: Track bot performance with detailed metrics
- **Risk Management**: Configurable stop-loss, take-profit, and position sizing

### 📊 Analytics & Analysis
- **Performance Dashboard**: Real-time portfolio performance metrics
- **P&L Analysis**: Detailed profit/loss breakdown by asset and timeframe
- **Market Analysis**: Technical indicators and chart analysis
- **Fear & Greed Index**: Market sentiment indicator
- **Economic Calendar**: Track major economic events affecting crypto markets
- **Advanced Charts**: Interactive TradingView-style charts with multiple timeframes

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication
- **Email Verification**: Two-factor email verification system
- **Password Recovery**: Secure password reset flow
- **Google OAuth**: Social login integration
- **Session Management**: Automatic token refresh and secure logout

### 📱 User Experience
- **Responsive Design**: Mobile-first design with TailwindCSS
- **Dark Theme**: Professional dark mode interface
- **Real-time Updates**: WebSocket-powered live data
- **Error Handling**: Comprehensive error boundaries and user feedback
- **Loading States**: Smooth loading indicators and transitions

## 🛠 Tech Stack

### Frontend
- **Framework**: React 19.1.1
- **Build Tool**: Vite 7.1.2
- **Styling**: TailwindCSS 3.4.0
- **Routing**: React Router DOM 7.8.2
- **Charts**: Lightweight Charts 5.0.8, Recharts 3.1.2
- **Forms**: React Hook Form 7.62.0 + Zod 4.1.5
- **HTTP Client**: Axios 1.11.0
- **State Management**: React Context API
- **OAuth**: @react-oauth/google 0.12.2

### Backend
- **Framework**: Django 4.2.0
- **API**: Django REST Framework 3.14.0
- **Authentication**: djangorestframework-simplejwt 5.2.0
- **Database**: MySQL (via mysqlclient 2.1.0)
- **CORS**: django-cors-headers 4.0.0

### AI & Analytics
- **Data Processing**: Pandas 2.0.0, NumPy 1.24.0
- **Technical Analysis**: TA-Lib 0.11.0
- **Machine Learning**: Scikit-learn 1.3.0
- **Visualization**: Plotly 5.18.0
- **Scientific Computing**: SciPy 1.11.0

### Real-time Communication
- **WebSocket**: Native WebSocket API
- **Market Data**: Binance WebSocket Streams

## 🏗 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (React)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Trading  │  │   Bots   │  │Analytics │  │ Analysis │     │
│  │Dashboard │  │Dashboard │  │Dashboard │  │  Tools   │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                    WebSocket + REST API
                          │
┌─────────────────────────────────────────────────────────────┐
│                   Server (Django)                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   Auth   │  │ Trading  │  │   Bot    │  │Analytics │     │
│  │  Module  │  │  Engine  │  │  Engine  │  │  Module  │     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                          │
                    ┌─────┴─────┐
                    │           │
              ┌─────▼────┐  ┌──▼──────┐
              │  MySQL   │  │ Binance │
              │ Database │  │   API   │
              └──────────┘  └─────────┘
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.0.0 or higher
- **Python**: 3.10 or higher
- **MySQL**: 8.0 or higher
- **npm** or **yarn**: Latest version
- **pip**: Latest version
- **Git**: For version control

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/krtx9/crypto-trading-platform.git
cd crypto-trading-platform
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd server
python -m venv venv

# On Windows
venv\Scripts\activate

#### Install Python Dependencies

```bash
pip install -r requirements.txt
```

#### Setup MySQL Database

#### Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
cp .env.example .env
```

Edit `server/.env`:

#### Run Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

### 3. Frontend Setup

#### Install Node Dependencies

```bash
cd ../client
npm install
```

#### Configure Environment Variables

Create a `.env` file in the `client` directory:

```bash
cp .env.example .env
```

Edit `client/.env`:


## ⚙️ Configuration

### Email Configuration (Gmail)

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a new app password for "Mail"
3. Use the generated password in `EMAIL_HOST_PASSWORD`


## 🏃 Running the Application

### Development Mode

#### Start Backend Server

```bash
cd server
python manage.py runserver
```

The Django server will start at `http://localhost:8000`

#### Start Frontend Development Server

Open a new terminal:

```bash
cd client
npm run dev
```

The React app will start at `http://localhost:5173`

### Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api


## 📁 Project Structure

```
crypto-trading-platform/
├── client/                          # Frontend React application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── auth/               # Authentication pages
│   │   │   ├── trading/            # Trading dashboard components
│   │   │   ├── bots/               # Bot management
│   │   │   ├── analytics/          # Analytics dashboards
│   │   │   ├── analysis/           # Market analysis tools
│   │   │   ├── calendar/           # Economic calendar
│   │   │   ├── profile/            # User profile
│   │   │   └── ui/                 # Reusable UI components
│   │   ├── contexts/               # React Context providers
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API service layer
│   │   ├── utils/                  # Utility functions
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx                # Entry point
│   ├── .env                        # Environment variables
│   ├── package.json                # Dependencies
│   ├── tailwind.config.js          # Tailwind configuration
│   └── vite.config.js              # Vite configuration
│
├── server/                          # Backend Django application
│   ├── accounts/                    # User authentication app
│   │   ├── migrations/             # Database migrations
│   │   ├── models.py               # User models
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # API views
│   │   └── urls.py                 # URL routing
│   ├── trading/                     # Trading engine app
│   │   ├── migrations/             # Database migrations
│   │   ├── models.py               # Trading models
│   │   ├── bot_engine.py           # AI bot strategies
│   │   ├── bot_execution.py        # Bot execution engine
│   │   ├── order_execution.py      # Order management
│   │   ├── analytics.py            # Analytics engine
│   │   ├── pnl_calculator.py       # P&L calculations
│   │   ├── price_streamer.py       # WebSocket price streaming
│   │   ├── serializers.py          # DRF serializers
│   │   ├── views.py                # API views
│   │   ├── bot_views.py            # Bot API endpoints
│   │   └── urls.py                 # URL routing
│   ├── core/                        # Project settings
│   │   ├── settings.py             # Django settings
│   │   ├── urls.py                 # Main URL configuration
│   │   └── middleware.py           # Custom middleware
│   ├── .env                        # Environment variables
│   ├── manage.py                   # Django management script
│   └── requirements.txt            # Python dependencies

```

## 📚 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register/          # Register new user
POST   /api/auth/login/             # Login user
POST   /api/auth/logout/            # Logout user
POST   /api/auth/refresh/           # Refresh JWT token
POST   /api/auth/verify-email/      # Verify email with OTP
POST   /api/auth/forgot-password/   # Request password reset
POST   /api/auth/reset-password/    # Reset password
GET    /api/auth/profile/           # Get user profile
PUT    /api/auth/profile/           # Update user profile
```

### Trading Endpoints

```
GET    /api/trading/positions/      # Get user positions
POST   /api/trading/orders/         # Place new order
GET    /api/trading/orders/         # Get order history
DELETE /api/trading/orders/:id/     # Cancel order
GET    /api/trading/trades/         # Get trade history
GET    /api/trading/balance/        # Get account balance
POST   /api/trading/leverage/       # Set leverage
```

### Bot Endpoints

```
GET    /api/trading/bots/           # List all bots
POST   /api/trading/bots/           # Create new bot
GET    /api/trading/bots/:id/       # Get bot details
PUT    /api/trading/bots/:id/       # Update bot
DELETE /api/trading/bots/:id/       # Delete bot
POST   /api/trading/bots/:id/start/ # Start bot
POST   /api/trading/bots/:id/stop/  # Stop bot
GET    /api/trading/bots/:id/performance/ # Get bot performance
POST   /api/trading/bots/backtest/  # Run backtest
```

### Analytics Endpoints

```
GET    /api/trading/analytics/performance/  # Performance metrics
GET    /api/trading/analytics/pnl/          # P&L analysis
GET    /api/trading/analytics/summary/      # Account summary
```

## 💹 Trading Features

### Supported Trading Pairs

- BTC/USDT (Bitcoin)
- ETH/USDT (Ethereum)
- BNB/USDT (Binance Coin)
- SOL/USDT (Solana)
- XRP/USDT (Ripple)
- ADA/USDT (Cardano)
- DOGE/USDT (Dogecoin)
- MATIC/USDT (Polygon)
- DOT/USDT (Polkadot)
- AVAX/USDT (Avalanche)
- LINK/USDT (Chainlink)
- UNI/USDT (Uniswap)

### Order Types

1. **Market Order**: Execute immediately at current market price
2. **Limit Order**: Execute at specified price or better

### Risk Management

- **Stop Loss**: Automatic position closure at specified loss level
- **Take Profit**: Automatic position closure at specified profit level
- **Leverage Control**: Adjustable leverage from 1x to 125x
- **Position Sizing**: Customizable position size per trade
