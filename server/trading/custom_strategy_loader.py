"""
Custom Strategy Loader
Allows users to upload and run their own Python trading strategies
"""
import os
import sys
import importlib.util
import inspect
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
import pandas as pd
import logging

logger = logging.getLogger(__name__)


class CustomStrategyLoader:
    """Load and execute user-uploaded custom strategies"""
    
    # Directory to store user strategies
    STRATEGIES_DIR = Path(__file__).parent / 'user_strategies'
    
    @classmethod
    def ensure_strategies_dir(cls):
        """Ensure the strategies directory exists"""
        cls.STRATEGIES_DIR.mkdir(exist_ok=True)
        
        # Create __init__.py to make it a package
        init_file = cls.STRATEGIES_DIR / '__init__.py'
        if not init_file.exists():
            init_file.write_text('# User strategies package\n')
    
    @classmethod
    def save_strategy(cls, user_id: int, strategy_name: str, code: str) -> Dict[str, Any]:
        """
        Save a user's custom strategy code
        
        Args:
            user_id: User ID
            strategy_name: Name for the strategy
            code: Python code as string
            
        Returns:
            Dict with success status and file path
        """
        cls.ensure_strategies_dir()
        
        # Sanitize filename
        safe_name = "".join(c for c in strategy_name if c.isalnum() or c in ('_', '-')).lower()
        filename = f"user_{user_id}_{safe_name}.py"
        filepath = cls.STRATEGIES_DIR / filename
        
        try:
            # Validate code before saving
            validation_result = cls.validate_strategy_code(code)
            if not validation_result['valid']:
                return {
                    'success': False,
                    'error': validation_result['error']
                }
            
            # Save the code
            filepath.write_text(code, encoding='utf-8')
            
            logger.info(f"Saved custom strategy: {filename}")
            
            return {
                'success': True,
                'filepath': str(filepath),
                'filename': filename
            }
            
        except Exception as e:
            logger.error(f"Failed to save strategy: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @classmethod
    def load_strategy(cls, user_id: int, strategy_name: str):
        """
        Load a user's custom strategy module
        
        Args:
            user_id: User ID
            strategy_name: Name of the strategy
            
        Returns:
            Strategy class or None
        """
        cls.ensure_strategies_dir()
        
        safe_name = "".join(c for c in strategy_name if c.isalnum() or c in ('_', '-')).lower()
        filename = f"user_{user_id}_{safe_name}.py"
        filepath = cls.STRATEGIES_DIR / filename
        
        if not filepath.exists():
            logger.error(f"Strategy file not found: {filename}")
            return None
        
        try:
            # Load the module dynamically
            spec = importlib.util.spec_from_file_location(
                f"user_strategy_{user_id}_{safe_name}",
                filepath
            )
            module = importlib.util.module_from_spec(spec)
            sys.modules[spec.name] = module
            spec.loader.exec_module(module)
            
            # Find the strategy class
            strategy_class = None
            for name, obj in inspect.getmembers(module, inspect.isclass):
                if hasattr(obj, 'generate_signal') and name != 'BaseStrategy':
                    strategy_class = obj
                    break
            
            if not strategy_class:
                logger.error(f"No strategy class found in {filename}")
                return None
            
            logger.info(f"Loaded custom strategy: {filename}")
            return strategy_class
            
        except Exception as e:
            logger.error(f"Failed to load strategy: {str(e)}")
            return None
    
    @classmethod
    def execute_custom_strategy(cls, user_id: int, strategy_name: str, 
                                data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Execute a custom strategy
        
        Args:
            user_id: User ID
            strategy_name: Name of the strategy
            data: Price data with indicators
            params: Strategy parameters
            
        Returns:
            Tuple of (signal, reason)
        """
        strategy_class = cls.load_strategy(user_id, strategy_name)
        
        if not strategy_class:
            return None, "Failed to load custom strategy"
        
        try:
            strategy_instance = strategy_class()
            signal, reason = strategy_instance.generate_signal(data, params)
            return signal, reason
            
        except Exception as e:
            logger.error(f"Strategy execution error: {str(e)}")
            return None, f"Execution error: {str(e)}"
    
    @classmethod
    def validate_strategy_code(cls, code: str) -> Dict[str, Any]:
        """
        Validate user-provided strategy code
        
        Args:
            code: Python code as string
            
        Returns:
            Dict with validation result
        """
        # Check for required components
        required_patterns = [
            'def generate_signal',
            'class',
        ]
        
        for pattern in required_patterns:
            if pattern not in code:
                return {
                    'valid': False,
                    'error': f'Strategy must contain: {pattern}'
                }
        
        # Check for dangerous operations
        dangerous_patterns = [
            'import os',
            'import sys',
            'import subprocess',
            '__import__',
            'eval(',
            'exec(',
            'open(',
            'file(',
            'compile(',
        ]
        
        for pattern in dangerous_patterns:
            if pattern in code:
                return {
                    'valid': False,
                    'error': f'Dangerous operation not allowed: {pattern}'
                }
        
        # Try to compile the code
        try:
            compile(code, '<string>', 'exec')
        except SyntaxError as e:
            return {
                'valid': False,
                'error': f'Syntax error: {str(e)}'
            }
        
        return {'valid': True}
    
    @classmethod
    def list_user_strategies(cls, user_id: int) -> list:
        """
        List all strategies for a user
        
        Args:
            user_id: User ID
            
        Returns:
            List of strategy filenames
        """
        cls.ensure_strategies_dir()
        
        prefix = f"user_{user_id}_"
        strategies = []
        
        for filepath in cls.STRATEGIES_DIR.glob(f"{prefix}*.py"):
            strategy_name = filepath.stem.replace(prefix, '').replace('_', ' ').title()
            strategies.append({
                'name': strategy_name,
                'filename': filepath.name,
                'created': filepath.stat().st_ctime
            })
        
        return strategies
    
    @classmethod
    def delete_strategy(cls, user_id: int, strategy_name: str) -> bool:
        """
        Delete a user's custom strategy
        
        Args:
            user_id: User ID
            strategy_name: Name of the strategy
            
        Returns:
            True if deleted successfully
        """
        safe_name = "".join(c for c in strategy_name if c.isalnum() or c in ('_', '-')).lower()
        filename = f"user_{user_id}_{safe_name}.py"
        filepath = cls.STRATEGIES_DIR / filename
        
        try:
            if filepath.exists():
                filepath.unlink()
                logger.info(f"Deleted strategy: {filename}")
                return True
            return False
        except Exception as e:
            logger.error(f"Failed to delete strategy: {str(e)}")
            return False
    
    @classmethod
    def get_strategy_template(cls) -> str:
        """
        Get a template for creating custom strategies
        
        Returns:
            Template code as string
        """
        return '''"""
Custom Trading Strategy Template

Your strategy must:
1. Have a class that inherits from BaseStrategy (optional)
2. Implement generate_signal(data, params) method
3. Return tuple of (signal, reason) where signal is 'BUY', 'SELL', or None
"""

import pandas as pd
from typing import Tuple, Optional, Dict


class MyCustomStrategy:
    """
    Your custom trading strategy
    
    The data DataFrame will have these columns:
    - timestamp, open, high, low, close, volume
    - Plus any technical indicators (sma_10, sma_20, rsi, macd, etc.)
    """
    
    def generate_signal(self, data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
        """
        Generate trading signal based on your logic
        
        Args:
            data: DataFrame with price data and indicators
            params: Dictionary of strategy parameters
            
        Returns:
            Tuple of (signal, reason)
            - signal: 'BUY', 'SELL', or None
            - reason: String explaining why the signal was generated
        """
        # Check if we have enough data
        if len(data) < 20:
            return None, "Insufficient data"
        
        # Get current price
        current_price = data['close'].iloc[-1]
        
        # Example: Simple moving average crossover
        sma_short = data['close'].rolling(window=10).mean().iloc[-1]
        sma_long = data['close'].rolling(window=20).mean().iloc[-1]
        
        # Example: RSI (if available in data)
        rsi = data.get('rsi', pd.Series([50])).iloc[-1] if 'rsi' in data.columns else 50
        
        # Your custom logic here
        if sma_short > sma_long and rsi < 70:
            return 'BUY', f'SMA crossover bullish, RSI: {rsi:.2f}'
        elif sma_short < sma_long and rsi > 30:
            return 'SELL', f'SMA crossover bearish, RSI: {rsi:.2f}'
        
        return None, 'No signal generated'
    
    def backtest(self, data: pd.DataFrame, params: Dict) -> Dict:
        """
        Optional: Custom backtesting logic
        
        If not implemented, the default backtester will be used
        """
        # Your backtest logic here
        pass


# You can add helper functions
def calculate_custom_indicator(data: pd.DataFrame) -> pd.Series:
    """Your custom indicator calculation"""
    return data['close'].rolling(window=14).mean()


# Example usage (this won't be executed, just for reference):
if __name__ == "__main__":
    # This section is for testing your strategy locally
    # It won't be executed when the strategy is loaded
    import numpy as np
    
    # Create sample data
    dates = pd.date_range(end=pd.Timestamp.now(), periods=100, freq='1H')
    sample_data = pd.DataFrame({
        'timestamp': dates,
        'open': np.random.randn(100).cumsum() + 100,
        'high': np.random.randn(100).cumsum() + 102,
        'low': np.random.randn(100).cumsum() + 98,
        'close': np.random.randn(100).cumsum() + 100,
        'volume': np.random.randint(1000, 10000, 100)
    })
    
    strategy = MyCustomStrategy()
    signal, reason = strategy.generate_signal(sample_data, {})
    print(f"Signal: {signal}, Reason: {reason}")
'''


# Example of integrating custom strategies with existing bot engine
def integrate_custom_strategy_with_bot_engine():
    """
    Integration example: How custom strategies work with BotEngine
    """
    from .bot_engine import StrategyFactory, StrategyEngine
    
    # Add custom strategy to factory (done at runtime)
    def register_custom_strategy(user_id: int, strategy_name: str):
        """Register a custom strategy with the factory"""
        
        class CustomStrategyWrapper:
            @staticmethod
            def generate_signal(data: pd.DataFrame, params: Dict) -> Tuple[Optional[str], str]:
                # Load and execute custom strategy
                return CustomStrategyLoader.execute_custom_strategy(
                    user_id, strategy_name, data, params
                )
        
        # Add to factory
        strategy_key = f'CUSTOM_{user_id}_{strategy_name.upper()}'
        StrategyFactory.STRATEGIES[strategy_key] = CustomStrategyWrapper
        
        return strategy_key
