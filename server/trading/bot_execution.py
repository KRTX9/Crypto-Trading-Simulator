"""
Bot Execution Service
Handles automated bot trading execution without interfering with manual trades
"""
import pandas as pd
from decimal import Decimal
from typing import Dict, Optional
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
import logging

from .models import TradingBot, BotTrade, TradingAccount, Position, MarketData
from .bot_engine import StrategyFactory
from .order_execution import OrderExecutionService
from .custom_strategy_loader import CustomStrategyLoader

logger = logging.getLogger(__name__)


class BotExecutionService:
    """Service to execute bot trading strategies"""
    
    @classmethod
    def execute_bot_strategy(cls, bot: TradingBot, current_price: Decimal, manual: bool = False) -> Dict:
        """
        Execute a bot's trading strategy based on current market conditions
        
        Args:
            bot: TradingBot instance
            current_price: Current market price
            manual: If True, execute regardless of bot status (for manual execution)
            
        Returns:
            Dict with execution result
        """
        if not manual and bot.status != 'ACTIVE':
            return {'success': False, 'message': 'Bot is not active'}
        
        try:
            # First check if we have an open position and handle take-profit/stop-loss
            open_bot_trade = BotTrade.objects.filter(
                bot=bot,
                is_closed=False
            ).first()
            
            if open_bot_trade:
                # Check if TP/SL should trigger
                tp_sl_result = cls._check_take_profit_stop_loss(open_bot_trade, current_price)
                if tp_sl_result:
                    return tp_sl_result
            
            # Get historical price data for the symbol using bot's timeframe
            price_data = cls._get_price_data(
                symbol=bot.symbol, 
                lookback_days=3, 
                current_price=current_price,
                timeframe_minutes=bot.timeframe
            )
            
            if price_data.empty or len(price_data) < 3:
                return {'success': False, 'message': 'Insufficient price data'}
            
            # Generate signal using bot's strategy
            if bot.strategy == 'CUSTOM':
                # Execute custom user strategy
                custom_strategy_name = bot.parameters.get('custom_strategy_name')
                if not custom_strategy_name:
                    return {'success': False, 'message': 'Custom strategy name not provided'}
                
                signal, reason = CustomStrategyLoader.execute_custom_strategy(
                    user_id=bot.account.user.id,
                    strategy_name=custom_strategy_name,
                    data=price_data,
                    params=bot.parameters
                )
            else:
                # Execute built-in strategy
                signal, reason = StrategyFactory.generate_signal(
                    bot.strategy,
                    price_data,
                    bot.parameters
                )
            
            if not signal:
                return {
                    'success': True,
                    'action': 'NO_SIGNAL',
                    'reason': reason
                }
            
            # Execute trade based on signal
            if signal == 'BUY' and not open_bot_trade:
                # Open long position
                result = cls._open_bot_position(bot, 'BUY', current_price, reason)
                return result
                
            elif signal == 'SELL':
                if open_bot_trade and open_bot_trade.side == 'BUY':
                    # Close long position
                    result = cls._close_bot_position(open_bot_trade, current_price, reason)
                    return result
                elif not open_bot_trade:
                    # Open short position
                    result = cls._open_bot_position(bot, 'SELL', current_price, reason)
                    return result
            
            return {
                'success': True,
                'action': 'NO_ACTION',
                'reason': 'Signal does not match current position state'
            }
            
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Bot execution failed for {bot.name}: {str(e)}\n{error_trace}")
            return {
                'success': False,
                'error': str(e),
                'details': error_trace if logger.level <= logging.DEBUG else None
            }
    
    @classmethod
    def _check_take_profit_stop_loss(cls, bot_trade: BotTrade, current_price: Decimal) -> Optional[Dict]:
        """
        Check if take-profit or stop-loss should trigger
        
        Args:
            bot_trade: Open bot trade
            current_price: Current market price
            
        Returns:
            Dict with close result if TP/SL triggered, None otherwise
        """
        if not bot_trade.take_profit_price and not bot_trade.stop_loss_price:
            return None
        
        # Check take-profit
        if bot_trade.take_profit_price:
            tp_triggered = False
            if bot_trade.side == 'BUY' and current_price >= bot_trade.take_profit_price:
                tp_triggered = True
                reason = f'Take profit triggered at ${current_price:.2f} (target: ${bot_trade.take_profit_price:.2f})'
            elif bot_trade.side == 'SELL' and current_price <= bot_trade.take_profit_price:
                tp_triggered = True
                reason = f'Take profit triggered at ${current_price:.2f} (target: ${bot_trade.take_profit_price:.2f})'
            
            if tp_triggered:
                logger.info(f"Bot {bot_trade.bot.name} TP triggered: {reason}")
                return cls._close_bot_position(bot_trade, current_price, reason)
        
        # Check stop-loss
        if bot_trade.stop_loss_price:
            sl_triggered = False
            if bot_trade.side == 'BUY' and current_price <= bot_trade.stop_loss_price:
                sl_triggered = True
                reason = f'Stop loss triggered at ${current_price:.2f} (limit: ${bot_trade.stop_loss_price:.2f})'
            elif bot_trade.side == 'SELL' and current_price >= bot_trade.stop_loss_price:
                sl_triggered = True
                reason = f'Stop loss triggered at ${current_price:.2f} (limit: ${bot_trade.stop_loss_price:.2f})'
            
            if sl_triggered:
                logger.info(f"Bot {bot_trade.bot.name} SL triggered: {reason}")
                return cls._close_bot_position(bot_trade, current_price, reason)
        
        return None
    
    @classmethod
    @transaction.atomic
    def _open_bot_position(cls, bot: TradingBot, side: str, price: Decimal, reason: str) -> Dict:
        """Open a new bot position with automatic TP/SL"""
        
        # Calculate position size based on bot settings
        quantity = bot.max_position_size
        
        # Check account balance
        if bot.account.available_balance < (quantity * price) / bot.leverage:
            return {
                'success': False,
                'error': 'Insufficient balance for bot trade'
            }
        
        # Create order through order execution service
        order_data = {
            'symbol': bot.symbol,
            'side': side,
            'type': 'MARKET',
            'quantity': float(quantity),
            'leverage': bot.leverage,
            'reduce_only': False
        }
        
        try:
            # Execute market order
            order_result = OrderExecutionService.execute_market_order(
                order_data=order_data,
                account=bot.account,
                current_price=price
            )
            
            if order_result.get('success'):
                # Calculate automatic take-profit and stop-loss levels from bot settings
                take_profit_pct = float(bot.take_profit_pct)  # Use bot's TP%
                stop_loss_pct = float(bot.stop_loss_pct)      # Use bot's SL%
                
                if side == 'BUY':
                    take_profit_price = price * (Decimal('1') + Decimal(str(take_profit_pct / 100)))
                    stop_loss_price = price * (Decimal('1') - Decimal(str(stop_loss_pct / 100)))
                else:  # SELL
                    take_profit_price = price * (Decimal('1') - Decimal(str(take_profit_pct / 100)))
                    stop_loss_price = price * (Decimal('1') + Decimal(str(stop_loss_pct / 100)))
                
                # Create bot trade record with TP/SL
                bot_trade = BotTrade.objects.create(
                    bot=bot,
                    account=bot.account,
                    symbol=bot.symbol,
                    side=side,
                    quantity=quantity,
                    entry_price=price,
                    take_profit_price=take_profit_price,
                    stop_loss_price=stop_loss_price,
                    signal_reason=reason,
                    is_closed=False
                )
                
                # Update bot stats
                bot.last_executed_at = timezone.now()
                bot.save()
                
                logger.info(f"Bot {bot.name} opened {side} position at {price}, TP: {take_profit_price}, SL: {stop_loss_price}")
                
                return {
                    'success': True,
                    'action': 'OPENED_POSITION',
                    'side': side,
                    'price': float(price),
                    'quantity': float(quantity),
                    'take_profit': float(take_profit_price),
                    'stop_loss': float(stop_loss_price),
                    'reason': reason,
                    'bot_trade_id': str(bot_trade.id)
                }
            else:
                return {
                    'success': False,
                    'error': order_result.get('error', 'Order execution failed')
                }
                
        except Exception as e:
            logger.error(f"Failed to open bot position: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @classmethod
    @transaction.atomic
    def _close_bot_position(cls, bot_trade: BotTrade, exit_price: Decimal, reason: str) -> Dict:
        """Close an existing bot position"""
        
        bot = bot_trade.bot
        
        # Calculate PnL
        if bot_trade.side == 'BUY':
            pnl = (exit_price - bot_trade.entry_price) * bot_trade.quantity
        else:
            pnl = (bot_trade.entry_price - exit_price) * bot_trade.quantity
        
        # Calculate commission
        commission = (bot_trade.quantity * exit_price) * Decimal('0.00055')
        realized_pnl = pnl - commission
        
        # Create closing order
        closing_side = 'SELL' if bot_trade.side == 'BUY' else 'BUY'
        order_data = {
            'symbol': bot.symbol,
            'side': closing_side,
            'type': 'MARKET',
            'quantity': float(bot_trade.quantity),
            'leverage': bot.leverage,
            'reduce_only': True
        }
        
        try:
            # Execute market order to close
            order_result = OrderExecutionService.execute_market_order(
                order_data=order_data,
                account=bot.account,
                current_price=exit_price
            )
            
            if order_result.get('success'):
                # Update bot trade
                bot_trade.exit_price = exit_price
                bot_trade.exit_time = timezone.now()
                bot_trade.realized_pnl = realized_pnl
                bot_trade.commission = commission
                bot_trade.is_closed = True
                bot_trade.save()
                
                # Update bot statistics
                bot.total_trades += 1
                bot.total_pnl += realized_pnl
                if realized_pnl > 0:
                    bot.winning_trades += 1
                bot.last_executed_at = timezone.now()
                bot.save()
                
                logger.info(f"Bot {bot.name} closed position at {exit_price}, PnL: {realized_pnl}")
                
                return {
                    'success': True,
                    'action': 'CLOSED_POSITION',
                    'entry_price': float(bot_trade.entry_price),
                    'exit_price': float(exit_price),
                    'pnl': float(realized_pnl),
                    'reason': reason
                }
            else:
                return {
                    'success': False,
                    'error': order_result.get('error', 'Order execution failed')
                }
                
        except Exception as e:
            logger.error(f"Failed to close bot position: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def _get_price_data(symbol: str, lookback_days: int = 3, current_price: Decimal = None, timeframe_minutes: int = 15) -> pd.DataFrame:
        """
        Get historical price data for a symbol (optimized for fast execution)
        Uses real-time current price and generates minimal historical data
        
        Args:
            symbol: Trading symbol
            lookback_days: Days of historical data (default 3 for fast execution)
            current_price: Current real-time price (if available)
            timeframe_minutes: Candlestick timeframe in minutes (default 15)
        """
        try:
            import numpy as np
            
            # Use provided current price or fetch from market data
            if current_price:
                price = float(current_price)
            else:
                market_data = MarketData.objects.filter(symbol=symbol).first()
                if market_data:
                    price = float(market_data.price)
                else:
                    # Fallback mock prices
                    mock_prices = {
                        'BTCUSDT': 65000,
                        'ETHUSDT': 3500,
                        'XRPUSDT': 0.52,
                        'ADAUSDT': 0.45,
                        'BNBUSDT': 600,
                        'DOTUSDT': 6.5,
                        'SOLUSDT': 150,
                        'SUIUSDT': 2.0,
                    }
                    price = mock_prices.get(symbol, 100)
            
            # Generate historical data based on timeframe
            candles_per_day = (24 * 60) // timeframe_minutes
            num_candles = min(lookback_days * candles_per_day, 100)  # Limit to 100 candles for speed
            dates = pd.date_range(end=datetime.now(), periods=num_candles, freq=f'{timeframe_minutes}min')
            
            # Generate realistic price movements backwards from current price
            # Adjust volatility based on timeframe (larger timeframes = larger movements)
            volatility = 0.0005 * (timeframe_minutes / 5)  # Scale volatility with timeframe
            returns = np.random.normal(0, volatility, num_candles - 1)
            
            # Build prices array with current_price as the LAST value
            prices = np.zeros(num_candles)
            prices[-1] = price  # Last candle = current real-time price
            
            # Generate historical prices backwards
            for i in range(num_candles - 2, -1, -1):
                prices[i] = prices[i + 1] / (1 + returns[i])
            
            # Create OHLC data with minor variations
            opens = prices * (1 + np.random.uniform(-0.0001, 0.0001, num_candles))
            highs = np.maximum(prices, opens) * (1 + np.random.uniform(0, 0.0003, num_candles))
            lows = np.minimum(prices, opens) * (1 - np.random.uniform(0, 0.0003, num_candles))
            
            df = pd.DataFrame({
                'timestamp': dates,
                'open': opens,
                'high': highs,
                'low': lows,
                'close': prices,  # Already has current_price as last value
                'volume': np.random.uniform(1000, 10000, num_candles)
            })
            
            # Double-check: Force last close to be exact current price
            df.iloc[-1, df.columns.get_loc('close')] = price
            df.iloc[-1, df.columns.get_loc('high')] = max(price, df.iloc[-1]['high'])
            df.iloc[-1, df.columns.get_loc('low')] = min(price, df.iloc[-1]['low'])
            
            return df
            
        except Exception as e:
            logger.error(f"Error generating price data: {str(e)}")
            return pd.DataFrame()
    
    @classmethod
    def check_and_execute_all_active_bots(cls):
        """
        Check and execute all active bots
        This can be called from a scheduled task (e.g., Celery, cron)
        """
        active_bots = TradingBot.objects.filter(status='ACTIVE')
        
        results = []
        for bot in active_bots:
            try:
                # Get current market price
                market_data = MarketData.objects.filter(symbol=bot.symbol).first()
                if not market_data:
                    logger.warning(f"No market data for {bot.symbol}, skipping bot {bot.name}")
                    continue
                
                current_price = market_data.price
                
                # Execute bot strategy
                result = cls.execute_bot_strategy(bot, current_price)
                results.append({
                    'bot_id': str(bot.id),
                    'bot_name': bot.name,
                    'result': result
                })
                
            except Exception as e:
                logger.error(f"Error executing bot {bot.name}: {str(e)}")
                results.append({
                    'bot_id': str(bot.id),
                    'bot_name': bot.name,
                    'error': str(e)
                })
        
        return results
