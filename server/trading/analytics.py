"""
Performance Analytics Calculator
Calculate P&L metrics, win rates, Sharpe ratio, drawdown, and risk metrics
"""
import numpy as np
import pandas as pd
from decimal import Decimal
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Q, Avg, Max, Min
from django.utils import timezone

from .models import Trade, TradingAccount, BotTrade, TradingBot, Position


class PerformanceAnalytics:
    """Calculate performance metrics for manual trading"""
    
    @staticmethod
    def get_account_analytics(account: TradingAccount, days: int = 30) -> Dict:
        """
        Calculate comprehensive analytics for a trading account
        
        Args:
            account: TradingAccount instance
            days: Number of days to analyze
            
        Returns:
            Dict with analytics metrics
        """
        # Get trades in the time period
        start_date = timezone.now() - timedelta(days=days)
        trades = Trade.objects.filter(
            account=account,
            created_at__gte=start_date
        ).order_by('created_at')
        
        if not trades.exists():
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'total_pnl': 0,
                'total_commission': 0,
                'net_pnl': 0,
                'average_win': 0,
                'average_loss': 0,
                'profit_factor': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'roi': 0,
                'daily_pnl': []
            }
        
        # Calculate basic metrics
        total_pnl = trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        total_commission = trades.aggregate(Sum('commission'))['commission__sum'] or Decimal('0')
        net_pnl = total_pnl - total_commission
        
        # Win/Loss statistics
        winning_trades = trades.filter(realized_pnl__gt=0)
        losing_trades = trades.filter(realized_pnl__lt=0)
        
        total_trades_count = trades.count()
        winning_count = winning_trades.count()
        losing_count = losing_trades.count()
        
        win_rate = (winning_count / total_trades_count * 100) if total_trades_count > 0 else 0
        
        # Average win/loss
        average_win = winning_trades.aggregate(Avg('realized_pnl'))['realized_pnl__avg'] or Decimal('0')
        average_loss = losing_trades.aggregate(Avg('realized_pnl'))['realized_pnl__avg'] or Decimal('0')
        
        # Profit factor
        total_wins = winning_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        total_losses = abs(losing_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0'))
        profit_factor = float(total_wins / total_losses) if total_losses > 0 else 0
        
        # Calculate Sharpe ratio
        returns = [float(trade.realized_pnl) for trade in trades]
        sharpe_ratio = PerformanceAnalytics._calculate_sharpe_ratio(returns)
        
        # Calculate max drawdown
        cumulative_pnl = []
        running_sum = 0
        for trade in trades:
            running_sum += float(trade.realized_pnl)
            cumulative_pnl.append(running_sum)
        
        max_drawdown = PerformanceAnalytics._calculate_max_drawdown(cumulative_pnl)
        
        # ROI calculation
        initial_balance = Decimal('50000')  # Default initial balance
        roi = float((net_pnl / initial_balance) * 100) if initial_balance > 0 else 0
        
        # Daily P&L breakdown
        daily_pnl = PerformanceAnalytics._calculate_daily_pnl(trades, days)
        
        # Calculate equity curve (cumulative balance over time)
        equity_curve = []
        cumulative_balance = float(account.balance) - float(net_pnl)  # Starting balance
        for day_data in daily_pnl:
            cumulative_balance += day_data['pnl']
            equity_curve.append({
                'date': day_data['date'],
                'equity': round(cumulative_balance, 2)
            })
        
        return {
            'total_trades': total_trades_count,
            'winning_trades': winning_count,
            'losing_trades': losing_count,
            'win_rate': round(win_rate, 2),
            'total_pnl': float(total_pnl),
            'total_commission': float(total_commission),
            'net_pnl': float(net_pnl),
            'average_win': float(average_win),
            'average_loss': float(average_loss),
            'profit_factor': round(profit_factor, 2),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'max_drawdown': round(max_drawdown, 2),
            'roi': round(roi, 2),
            'daily_pnl': daily_pnl,
            'equity_curve': equity_curve,
            'best_trade': float(winning_trades.aggregate(Max('realized_pnl'))['realized_pnl__max'] or Decimal('0')),
            'worst_trade': float(losing_trades.aggregate(Min('realized_pnl'))['realized_pnl__min'] or Decimal('0')),
            'value_at_risk': 0,  # Placeholder
            'sortino_ratio': 0,  # Placeholder
            'calmar_ratio': 0  # Placeholder
        }
    
    @staticmethod
    def get_bot_analytics(bot: TradingBot) -> Dict:
        """
        Calculate analytics for a specific bot
        
        Args:
            bot: TradingBot instance
            
        Returns:
            Dict with bot analytics
        """
        bot_trades = BotTrade.objects.filter(bot=bot, is_closed=True).order_by('entry_time')
        
        if not bot_trades.exists():
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'total_pnl': 0,
                'average_pnl_per_trade': 0,
                'best_trade': 0,
                'worst_trade': 0,
                'sharpe_ratio': 0,
                'max_drawdown': 0,
                'profit_factor': 0,
                'recent_trades': []
            }
        
        # Basic statistics
        total_pnl = bot_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        winning_trades = bot_trades.filter(realized_pnl__gt=0)
        losing_trades = bot_trades.filter(realized_pnl__lt=0)
        
        total_count = bot_trades.count()
        winning_count = winning_trades.count()
        losing_count = losing_trades.count()
        
        win_rate = (winning_count / total_count * 100) if total_count > 0 else 0
        average_pnl = float(total_pnl) / total_count if total_count > 0 else 0
        
        # Best and worst trades
        best_trade = bot_trades.aggregate(Max('realized_pnl'))['realized_pnl__max'] or Decimal('0')
        worst_trade = bot_trades.aggregate(Min('realized_pnl'))['realized_pnl__min'] or Decimal('0')
        
        # Calculate Sharpe ratio
        returns = [float(trade.realized_pnl) for trade in bot_trades]
        sharpe_ratio = PerformanceAnalytics._calculate_sharpe_ratio(returns)
        
        # Calculate max drawdown
        cumulative_pnl = []
        running_sum = 0
        for trade in bot_trades:
            running_sum += float(trade.realized_pnl)
            cumulative_pnl.append(running_sum)
        
        max_drawdown = PerformanceAnalytics._calculate_max_drawdown(cumulative_pnl)
        
        # Profit factor
        total_wins = winning_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        total_losses = abs(losing_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0'))
        profit_factor = float(total_wins / total_losses) if total_losses > 0 else 0
        
        # Recent trades
        recent_trades = bot_trades[:10]
        recent_trades_data = [
            {
                'entry_time': trade.entry_time.isoformat(),
                'exit_time': trade.exit_time.isoformat() if trade.exit_time else None,
                'side': trade.side,
                'entry_price': float(trade.entry_price),
                'exit_price': float(trade.exit_price) if trade.exit_price else None,
                'pnl': float(trade.realized_pnl),
                'reason': trade.signal_reason
            }
            for trade in recent_trades
        ]
        
        return {
            'total_trades': total_count,
            'winning_trades': winning_count,
            'losing_trades': losing_count,
            'win_rate': round(win_rate, 2),
            'total_pnl': float(total_pnl),
            'average_pnl_per_trade': round(average_pnl, 2),
            'best_trade': float(best_trade),
            'worst_trade': float(worst_trade),
            'sharpe_ratio': round(sharpe_ratio, 2),
            'max_drawdown': round(max_drawdown, 2),
            'profit_factor': round(profit_factor, 2),
            'recent_trades': recent_trades_data
        }
    
    @staticmethod
    def get_comparison_analytics(account: TradingAccount) -> Dict:
        """
        Compare manual trading vs bot trading performance
        
        Args:
            account: TradingAccount instance
            
        Returns:
            Dict with comparison metrics
        """
        # Manual trades
        manual_trades = Trade.objects.filter(account=account)
        manual_pnl = manual_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        manual_count = manual_trades.count()
        
        # Bot trades
        bot_trades = BotTrade.objects.filter(account=account, is_closed=True)
        bot_pnl = bot_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
        bot_count = bot_trades.count()
        
        # Calculate win rates
        manual_win_rate = 0
        if manual_count > 0:
            manual_wins = manual_trades.filter(realized_pnl__gt=0).count()
            manual_win_rate = (manual_wins / manual_count) * 100
        
        bot_win_rate = 0
        if bot_count > 0:
            bot_wins = bot_trades.filter(realized_pnl__gt=0).count()
            bot_win_rate = (bot_wins / bot_count) * 100
        
        return {
            'manual_trading': {
                'total_trades': manual_count,
                'total_pnl': float(manual_pnl),
                'win_rate': round(manual_win_rate, 2),
                'average_pnl': float(manual_pnl / manual_count) if manual_count > 0 else 0
            },
            'bot_trading': {
                'total_trades': bot_count,
                'total_pnl': float(bot_pnl),
                'win_rate': round(bot_win_rate, 2),
                'average_pnl': float(bot_pnl / bot_count) if bot_count > 0 else 0
            },
            'combined': {
                'total_trades': manual_count + bot_count,
                'total_pnl': float(manual_pnl + bot_pnl)
            }
        }
    
    @staticmethod
    def get_risk_metrics(account: TradingAccount) -> Dict:
        """
        Calculate risk metrics for the account
        
        Args:
            account: TradingAccount instance
            
        Returns:
            Dict with risk metrics
        """
        # Current positions
        open_positions = Position.objects.filter(account=account, status='OPEN')
        
        total_margin_used = sum([float(pos.margin) for pos in open_positions])
        total_unrealized_pnl = sum([float(pos.unrealized_pnl) for pos in open_positions])
        
        # Calculate Value at Risk (simplified)
        account_balance = float(account.balance)
        total_equity = account_balance + total_unrealized_pnl
        
        # Margin ratio
        margin_ratio = (total_margin_used / total_equity * 100) if total_equity > 0 else 0
        
        # Risk level
        if margin_ratio < 30:
            risk_level = 'LOW'
        elif margin_ratio < 60:
            risk_level = 'MEDIUM'
        elif margin_ratio < 80:
            risk_level = 'HIGH'
        else:
            risk_level = 'CRITICAL'
        
        return {
            'open_positions_count': open_positions.count(),
            'total_margin_used': round(total_margin_used, 2),
            'available_balance': float(account.available_balance),
            'total_unrealized_pnl': round(total_unrealized_pnl, 2),
            'total_equity': round(total_equity, 2),
            'margin_ratio': round(margin_ratio, 2),
            'risk_level': risk_level
        }
    
    @staticmethod
    def _calculate_sharpe_ratio(returns: List[float], risk_free_rate: float = 0.0) -> float:
        """
        Calculate Sharpe ratio from returns
        
        Args:
            returns: List of return values
            risk_free_rate: Risk-free rate (default 0)
            
        Returns:
            Sharpe ratio
        """
        if not returns or len(returns) < 2:
            return 0.0
        
        returns_array = np.array(returns)
        mean_return = np.mean(returns_array)
        std_return = np.std(returns_array)
        
        if std_return == 0:
            return 0.0
        
        sharpe = (mean_return - risk_free_rate) / std_return
        return float(sharpe)
    
    @staticmethod
    def _calculate_max_drawdown(cumulative_returns: List[float]) -> float:
        """
        Calculate maximum drawdown from cumulative returns
        
        Args:
            cumulative_returns: List of cumulative return values
            
        Returns:
            Maximum drawdown percentage
        """
        if not cumulative_returns:
            return 0.0
        
        returns_array = np.array(cumulative_returns)
        running_max = np.maximum.accumulate(returns_array)
        drawdown = (returns_array - running_max) / (running_max + 1e-10)  # Avoid division by zero
        max_dd = np.min(drawdown) * 100
        
        return float(max_dd)
    
    @staticmethod
    def _calculate_daily_pnl(trades, days: int) -> List[Dict]:
        """
        Calculate daily P&L breakdown
        
        Args:
            trades: QuerySet of Trade objects
            days: Number of days
            
        Returns:
            List of daily P&L data
        """
        daily_data = []
        start_date = timezone.now() - timedelta(days=days)
        
        for i in range(days):
            current_date = start_date + timedelta(days=i)
            next_date = current_date + timedelta(days=1)
            
            day_trades = trades.filter(
                created_at__gte=current_date,
                created_at__lt=next_date
            )
            
            day_pnl = day_trades.aggregate(Sum('realized_pnl'))['realized_pnl__sum'] or Decimal('0')
            
            daily_data.append({
                'date': current_date.strftime('%Y-%m-%d'),
                'pnl': float(day_pnl),
                'trades_count': day_trades.count()
            })
        
        return daily_data
