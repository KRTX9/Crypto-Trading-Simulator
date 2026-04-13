"""
Bot Management and Analytics API Views
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal
import pandas as pd

from .models import TradingAccount, TradingBot, BotTrade, BotPerformance, MarketData
from .serializers import (
    TradingBotSerializer, CreateBotSerializer, UpdateBotSerializer,
    BotTradeSerializer, BotPerformanceSerializer, BacktestRequestSerializer,
    AnalyticsResponseSerializer
)
from .bot_execution import BotExecutionService
from .bot_engine import Backtester, StrategyFactory
from .analytics import PerformanceAnalytics


# ======================
# Bot Management Views
# ======================

class BotListView(APIView):
    """List all bots or create a new bot"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all bots for the user"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bots = TradingBot.objects.filter(account=account)
        serializer = TradingBotSerializer(bots, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """Create a new trading bot"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        serializer = CreateBotSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Create bot
        bot = TradingBot.objects.create(
            account=account,
            name=serializer.validated_data['name'],
            strategy=serializer.validated_data['strategy'],
            symbol=serializer.validated_data['symbol'],
            parameters=serializer.validated_data.get('parameters', {}),
            timeframe=serializer.validated_data.get('timeframe', 15),
            max_position_size=serializer.validated_data.get('max_position_size', Decimal('0.01')),
            take_profit_pct=serializer.validated_data.get('take_profit_pct', Decimal('2.0')),
            stop_loss_pct=serializer.validated_data.get('stop_loss_pct', Decimal('1.0')),
            leverage=serializer.validated_data.get('leverage', 10),
            status='PAUSED'
        )
        
        response_serializer = TradingBotSerializer(bot)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class BotDetailView(APIView):
    """Get, update or delete a specific bot"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, bot_id):
        """Get bot details"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        serializer = TradingBotSerializer(bot)
        return Response(serializer.data)
    
    def patch(self, request, bot_id):
        """Update bot settings"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        serializer = UpdateBotSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update bot fields
        for field, value in serializer.validated_data.items():
            setattr(bot, field, value)
        bot.save()
        
        response_serializer = TradingBotSerializer(bot)
        return Response(response_serializer.data)
    
    def delete(self, request, bot_id):
        """Delete a bot"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        # Only allow deletion if bot is stopped
        if bot.status == 'ACTIVE':
            return Response(
                {'error': 'Cannot delete an active bot. Stop it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bot.delete()
        return Response({'success': True, 'message': 'Bot deleted successfully'})


class BotControlView(APIView):
    """Start, pause or stop a bot"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, bot_id, action):
        """Control bot status"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        if action == 'start':
            bot.status = 'ACTIVE'
            message = f'Bot {bot.name} started'
        elif action == 'pause':
            bot.status = 'PAUSED'
            message = f'Bot {bot.name} paused'
        elif action == 'stop':
            bot.status = 'STOPPED'
            message = f'Bot {bot.name} stopped'
        else:
            return Response(
                {'error': 'Invalid action. Use: start, pause, or stop'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bot.save()
        
        serializer = TradingBotSerializer(bot)
        return Response({
            'success': True,
            'message': message,
            'bot': serializer.data
        })


class BotExecuteView(APIView):
    """Manually trigger bot execution"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, bot_id):
        """Execute bot strategy once"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        # Get current market price
        market_data = MarketData.objects.filter(symbol=bot.symbol).first()
        if not market_data:
            # Generate realistic starting price for the symbol - Updated to match current market (Oct 2025)
            symbol_prices = {
                'BTCUSDT': Decimal('124000.00'),  # Bitcoin
                'ETHUSDT': Decimal('4676.00'),    # Ethereum
                'BNBUSDT': Decimal('693.00'),     # Binance Coin
                'XRPUSDT': Decimal('2.97'),       # Ripple
                'ADAUSDT': Decimal('1.15'),       # Cardano
                'SOLUSDT': Decimal('243.00'),     # Solana
                'DOTUSDT': Decimal('18.50'),      # Polkadot
                'SUIUSDT': Decimal('4.68'),       # Sui
                'AVAXUSDT': Decimal('86.00'),     # Avalanche
                'MATICUSDT': Decimal('1.12'),     # Polygon
                'LINKUSDT': Decimal('23.50'),     # Chainlink
                'UNIUSDT': Decimal('13.80'),      # Uniswap
                'ATOMUSDT': Decimal('17.20'),     # Cosmos
                'LTCUSDT': Decimal('108.00'),     # Litecoin
                'TRXUSDT': Decimal('0.44'),       # Tron
            }
            price = symbol_prices.get(bot.symbol, Decimal('100.00'))
            
            # Create market data entry
            market_data = MarketData.objects.create(
                symbol=bot.symbol,
                price=price,
                volume=Decimal('1000000')
            )
        
        # Execute bot strategy (manual=True to allow execution regardless of bot status)
        result = BotExecutionService.execute_bot_strategy(bot, market_data.price, manual=True)
        
        return Response(result)


class BotTradesView(APIView):
    """Get bot's trade history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, bot_id):
        """Get all trades for a bot"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        trades = BotTrade.objects.filter(bot=bot).order_by('-entry_time')[:50]
        serializer = BotTradeSerializer(trades, many=True)
        
        return Response(serializer.data)


class BotPerformanceView(APIView):
    """Get bot performance metrics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, bot_id):
        """Get performance analytics for a bot"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        bot = get_object_or_404(TradingBot, id=bot_id, account=account)
        
        # Get analytics
        analytics = PerformanceAnalytics.get_bot_analytics(bot)
        
        return Response(analytics)


class BacktestView(APIView):
    """Backtest a strategy"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Run backtest on a strategy"""
        serializer = BacktestRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        strategy = serializer.validated_data['strategy']
        symbol = serializer.validated_data['symbol']
        parameters = serializer.validated_data.get('parameters', {})
        initial_capital = serializer.validated_data.get('initial_capital', Decimal('10000'))
        
        # Get historical price data
        price_data = BotExecutionService._get_price_data(symbol, lookback_days=60)
        
        if price_data.empty:
            return Response(
                {'error': 'Unable to generate price data for backtesting'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Run backtest
        results = Backtester.run_backtest(strategy, price_data, parameters, initial_capital)
        
        return Response(results)


# ======================
# Analytics Views
# ======================

class AnalyticsDashboardView(APIView):
    """Get comprehensive analytics dashboard data"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get analytics for the user's account"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        days = int(request.query_params.get('days', 30))
        
        # Get account analytics
        account_analytics = PerformanceAnalytics.get_account_analytics(account, days)
        
        # Get comparison analytics
        comparison = PerformanceAnalytics.get_comparison_analytics(account)
        
        # Get risk metrics
        risk_metrics = PerformanceAnalytics.get_risk_metrics(account)
        
        return Response({
            'account_analytics': account_analytics,
            'comparison': comparison,
            'risk_metrics': risk_metrics
        })


class RiskMetricsView(APIView):
    """Get risk metrics for the account"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current risk metrics"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        risk_metrics = PerformanceAnalytics.get_risk_metrics(account)
        return Response(risk_metrics)


class ComparisonAnalyticsView(APIView):
    """Get bot-wise analytics for comparison"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get analytics for each bot for comparison"""
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        # Get all bots for the account
        bots = TradingBot.objects.filter(account=account)
        
        # Get analytics for each bot
        bot_analytics = []
        for bot in bots:
            analytics = PerformanceAnalytics.get_bot_analytics(bot)
            bot_analytics.append({
                'bot_id': str(bot.id),
                'bot_name': bot.name,
                'strategy_type': bot.get_strategy_display(),
                'status': bot.status,
                'symbol': bot.symbol,
                'total_trades': analytics['total_trades'],
                'win_rate': analytics['win_rate'],
                'total_pnl': analytics['total_pnl'],
                'avg_pnl': analytics['average_pnl_per_trade'],
                'sharpe_ratio': analytics['sharpe_ratio'],
                'max_drawdown': analytics['max_drawdown'],
                'profit_factor': analytics['profit_factor']
            })
        
        return Response(bot_analytics)


class StrategyListView(APIView):
    """Get list of available strategies"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all available trading strategies"""
        strategies = [
            {
                'id': choice[0],
                'name': choice[1],
                'description': self._get_strategy_description(choice[0]),
                'default_parameters': self._get_default_parameters(choice[0])
            }
            for choice in TradingBot.STRATEGY_CHOICES
        ]
        
        return Response(strategies)
    
    def _get_strategy_description(self, strategy_id):
        """Get strategy description"""
        descriptions = {
            'SMA_CROSSOVER': 'Simple Moving Average crossover strategy. Generates signals when fast SMA crosses slow SMA.',
            'RSI': 'Relative Strength Index strategy. Buys when oversold, sells when overbought.',
            'MACD': 'Moving Average Convergence Divergence strategy. Trades on MACD line crossovers.',
            'BOLLINGER_BANDS': 'Bollinger Bands mean reversion. Buys at lower band, sells at upper band.',
            'MOMENTUM': 'Momentum-based strategy. Follows strong price movements.',
            'MEAN_REVERSION': 'Mean reversion strategy. Trades when price deviates from mean.',
            'GRID': 'Grid trading strategy. Places orders at regular intervals.',
        }
        return descriptions.get(strategy_id, 'No description available')
    
    def _get_default_parameters(self, strategy_id):
        """Get default parameters for strategy"""
        defaults = {
            'SMA_CROSSOVER': {'short_period': 10, 'long_period': 50},
            'RSI': {'oversold': 30, 'overbought': 70},
            'MACD': {},
            'BOLLINGER_BANDS': {},
            'MOMENTUM': {'momentum_threshold': 2.0},
            'MEAN_REVERSION': {'window': 20, 'std_multiplier': 2.0},
            'GRID': {'grid_size': 5, 'grid_spacing': 0.01},
        }
        return defaults.get(strategy_id, {})
