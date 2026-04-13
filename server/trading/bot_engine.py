"""
Bot Strategy Engine
Implements trading strategies with technical indicators for automated bot trading
"""
import pandas as pd
import numpy as np
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

try:
    import ta
    from ta.trend import SMAIndicator, MACD, EMAIndicator
    from ta.momentum import RSIIndicator, StochasticOscillator
    from ta.volatility import BollingerBands
    TA_AVAILABLE = True
except ImportError:
    TA_AVAILABLE = False
    logger.warning("TA library not available. Install with: pip install ta")


class StrategyEngine:
    """Base class for trading strategies"""
    
    @staticmethod
    def calculate_indicators(price_data: pd.DataFrame) -> pd.DataFrame:
        """Calculate all technical indicators for the price data"""
        if not TA_AVAILABLE:
            logger.error("TA library not installed")
            return price_data
        
        df = price_data.copy()
        
        try:
            # Simple Moving Averages
            df['sma_10'] = SMAIndicator(close=df['close'], window=10).sma_indicator()
            df['sma_20'] = SMAIndicator(close=df['close'], window=20).sma_indicator()
            df['sma_50'] = SMAIndicator(close=df['close'], window=50).sma_indicator()
            
            # Exponential Moving Averages
            df['ema_12'] = EMAIndicator(close=df['close'], window=12).ema_indicator()
            df['ema_26'] = EMAIndicator(close=df['close'], window=26).ema_indicator()
            
            # RSI
            df['rsi'] = RSIIndicator(close=df['close'], window=14).rsi()
            
            # MACD
            macd = MACD(close=df['close'])
            df['macd'] = macd.macd()
            df['macd_signal'] = macd.macd_signal()
            df['macd_diff'] = macd.macd_diff()
            
            # Bollinger Bands
            bollinger = BollingerBands(close=df['close'], window=20, window_dev=2)
            df['bb_upper'] = bollinger.bollinger_hband()
            df['bb_middle'] = bollinger.bollinger_mavg()
            df['bb_lower'] = bollinger.bollinger_lband()
            
            # Stochastic Oscillator
            stoch = StochasticOscillator(high=df['high'], low=df['low'], close=df['close'])
            df['stoch_k'] = stoch.stoch()
            df['stoch_d'] = stoch.stoch_signal()
            
        except Exception as e:
            logger.error(f"Error calculating indicators: {e}")
        
        return df


class SMACrossoverStrategy:
    """Simple Moving Average Crossover Strategy"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on SMA crossover
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 50:
            return None, "Insufficient data"
        
        short_period = params.get('short_period', 10)
        long_period = params.get('long_period', 50)
        
        # Get latest values
        current_short = data['sma_10'].iloc[-1] if short_period == 10 else data['sma_20'].iloc[-1]
        current_long = data['sma_50'].iloc[-1]
        
        prev_short = data['sma_10'].iloc[-2] if short_period == 10 else data['sma_20'].iloc[-2]
        prev_long = data['sma_50'].iloc[-2]
        
        # Bullish crossover
        if prev_short <= prev_long and current_short > current_long:
            return 'BUY', f'SMA{short_period} crossed above SMA{long_period}'
        
        # Bearish crossover
        if prev_short >= prev_long and current_short < current_long:
            return 'SELL', f'SMA{short_period} crossed below SMA{long_period}'
        
        return None, 'No crossover detected'


class RSIStrategy:
    """RSI-based Mean Reversion Strategy"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on RSI
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 14:
            return None, "Insufficient data"
        
        oversold_level = params.get('oversold', 30)
        overbought_level = params.get('overbought', 70)
        
        current_rsi = data['rsi'].iloc[-1]
        
        if pd.isna(current_rsi):
            return None, "RSI not available"
        
        # Oversold - Buy signal
        if current_rsi < oversold_level:
            return 'BUY', f'RSI oversold at {current_rsi:.2f}'
        
        # Overbought - Sell signal
        if current_rsi > overbought_level:
            return 'SELL', f'RSI overbought at {current_rsi:.2f}'
        
        return None, f'RSI neutral at {current_rsi:.2f}'


class MACDStrategy:
    """MACD Strategy"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on MACD
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 26:
            return None, "Insufficient data"
        
        current_macd = data['macd'].iloc[-1]
        current_signal = data['macd_signal'].iloc[-1]
        prev_macd = data['macd'].iloc[-2]
        prev_signal = data['macd_signal'].iloc[-2]
        
        if pd.isna(current_macd) or pd.isna(current_signal):
            return None, "MACD not available"
        
        # Bullish crossover
        if prev_macd <= prev_signal and current_macd > current_signal:
            return 'BUY', f'MACD bullish crossover'
        
        # Bearish crossover
        if prev_macd >= prev_signal and current_macd < current_signal:
            return 'SELL', f'MACD bearish crossover'
        
        return None, 'No MACD crossover'


class BollingerBandsStrategy:
    """Bollinger Bands Mean Reversion Strategy"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on Bollinger Bands
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 20:
            return None, "Insufficient data"
        
        current_price = data['close'].iloc[-1]
        bb_upper = data['bb_upper'].iloc[-1]
        bb_lower = data['bb_lower'].iloc[-1]
        bb_middle = data['bb_middle'].iloc[-1]
        
        if pd.isna(bb_upper) or pd.isna(bb_lower):
            return None, "Bollinger Bands not available"
        
        # Price touches lower band - Buy signal
        if current_price <= bb_lower:
            return 'BUY', f'Price at lower Bollinger Band'
        
        # Price touches upper band - Sell signal
        if current_price >= bb_upper:
            return 'SELL', f'Price at upper Bollinger Band'
        
        return None, f'Price within Bollinger Bands'


class MomentumStrategy:
    """Momentum-based Strategy using RSI and Price Action"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on momentum
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 20:
            return None, "Insufficient data"
        
        # Calculate momentum
        current_price = data['close'].iloc[-1]
        past_price = data['close'].iloc[-20]
        momentum = ((current_price - past_price) / past_price) * 100
        
        rsi = data['rsi'].iloc[-1]
        threshold = params.get('momentum_threshold', 2.0)  # 2% move
        
        # Strong upward momentum with RSI confirmation
        if momentum > threshold and rsi < 70:
            return 'BUY', f'Strong upward momentum: {momentum:.2f}%'
        
        # Strong downward momentum with RSI confirmation
        if momentum < -threshold and rsi > 30:
            return 'SELL', f'Strong downward momentum: {momentum:.2f}%'
        
        return None, f'Weak momentum: {momentum:.2f}%'


class MeanReversionStrategy:
    """Mean Reversion Strategy using standard deviation"""
    
    @staticmethod
    def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on mean reversion
        Returns: (signal: 'BUY'/'SELL'/None, reason: str)
        """
        if len(data) < 20:
            return None, "Insufficient data"
        
        window = params.get('window', 20)
        std_multiplier = params.get('std_multiplier', 2.0)
        
        # Calculate rolling mean and std
        mean = data['close'].rolling(window=window).mean().iloc[-1]
        std = data['close'].rolling(window=window).std().iloc[-1]
        current_price = data['close'].iloc[-1]
        
        if pd.isna(mean) or pd.isna(std):
            return None, "Statistics not available"
        
        # Price significantly below mean - Buy signal
        if current_price < mean - (std * std_multiplier):
            deviation = ((mean - current_price) / mean) * 100
            return 'BUY', f'Price {deviation:.2f}% below mean'
        
        # Price significantly above mean - Sell signal
        if current_price > mean + (std * std_multiplier):
            deviation = ((current_price - mean) / mean) * 100
            return 'SELL', f'Price {deviation:.2f}% above mean'
        
        return None, 'Price near mean'


class StrategyFactory:
    """Factory to create and execute strategies"""
    
    STRATEGIES = {
        'SMA_CROSSOVER': SMACrossoverStrategy,
        'RSI': RSIStrategy,
        'MACD': MACDStrategy,
        'BOLLINGER_BANDS': BollingerBandsStrategy,
        'MOMENTUM': MomentumStrategy,
        'MEAN_REVERSION': MeanReversionStrategy,
    }
    
    @classmethod
    def get_strategy(cls, strategy_name: str):
        """Get strategy class by name"""
        return cls.STRATEGIES.get(strategy_name)
    
    @classmethod
    def generate_signal(cls, strategy_name: str, data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """Generate signal for a given strategy"""
        strategy_class = cls.get_strategy(strategy_name)
        
        if not strategy_class:
            return None, f"Unknown strategy: {strategy_name}"
        
        if not TA_AVAILABLE:
            return None, "Technical analysis library not available"
        
        # Calculate indicators
        data_with_indicators = StrategyEngine.calculate_indicators(data)
        
        # Generate signal
        return strategy_class.generate_signal(data_with_indicators, params)


class Backtester:
    """Backtest trading strategies on historical data"""
    
    @staticmethod
    def run_backtest(strategy_name: str, data: pd.DataFrame, params: Dict, 
                     initial_capital: Decimal = Decimal('10000')) -> Dict:
        """
        Run backtest on historical data
        
        Returns:
            Dict with backtest results including:
            - total_return
            - win_rate
            - total_trades
            - sharpe_ratio
            - max_drawdown
        """
        if len(data) < 50:
            return {
                'error': 'Insufficient data for backtesting',
                'trades': []
            }
        
        # Calculate indicators
        data_with_indicators = StrategyEngine.calculate_indicators(data)
        
        trades = []
        capital = initial_capital
        position = None
        winning_trades = 0
        
        for i in range(50, len(data_with_indicators)):
            current_data = data_with_indicators.iloc[:i+1]
            signal, reason = StrategyFactory.generate_signal(strategy_name, current_data, params)
            
            current_price = current_data['close'].iloc[-1]
            
            # Open position
            if signal and not position:
                position = {
                    'side': 'LONG' if signal == 'BUY' else 'SHORT',
                    'entry_price': current_price,
                    'entry_time': i,
                    'reason': reason
                }
            
            # Close position
            elif position:
                should_close = False
                
                # Opposite signal
                if signal:
                    if (position['side'] == 'LONG' and signal == 'SELL') or \
                       (position['side'] == 'SHORT' and signal == 'BUY'):
                        should_close = True
                
                if should_close or i == len(data_with_indicators) - 1:
                    # Calculate PnL
                    if position['side'] == 'LONG':
                        pnl = (current_price - position['entry_price']) / position['entry_price']
                    else:
                        pnl = (position['entry_price'] - current_price) / position['entry_price']
                    
                    pnl_amount = capital * Decimal(str(pnl)) * Decimal('0.01')  # 1% position size
                    capital += pnl_amount
                    
                    if pnl > 0:
                        winning_trades += 1
                    
                    trades.append({
                        'side': position['side'],
                        'entry_price': float(position['entry_price']),
                        'exit_price': float(current_price),
                        'pnl': float(pnl * 100),  # Percentage
                        'pnl_amount': float(pnl_amount),
                        'reason': position['reason']
                    })
                    
                    position = None
        
        # Calculate metrics
        total_return = float(((capital - initial_capital) / initial_capital) * 100)
        win_rate = (winning_trades / len(trades) * 100) if trades else 0
        
        # Calculate Sharpe ratio (simplified)
        returns = [trade['pnl'] for trade in trades]
        sharpe_ratio = 0
        if returns and len(returns) > 1:
            mean_return = np.mean(returns)
            std_return = np.std(returns)
            sharpe_ratio = (mean_return / std_return) if std_return > 0 else 0
        
        # Calculate max drawdown
        cumulative_returns = np.cumsum([trade['pnl_amount'] for trade in trades])
        running_max = np.maximum.accumulate(cumulative_returns) if len(cumulative_returns) > 0 else [0]
        drawdown = cumulative_returns - running_max
        max_drawdown = float(np.min(drawdown)) if len(drawdown) > 0 else 0
        
        return {
            'total_return': total_return,
            'win_rate': win_rate,
            'total_trades': len(trades),
            'winning_trades': winning_trades,
            'sharpe_ratio': float(sharpe_ratio),
            'max_drawdown': max_drawdown,
            'final_capital': float(capital),
            'trades': trades[:50]  # Return last 50 trades for display
        }
