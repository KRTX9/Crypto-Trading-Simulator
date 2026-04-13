"""
Custom middleware for handling Cross-Origin-Opener-Policy and security headers
specifically for Google OAuth integration.
"""
import time
import threading
import logging
import random
from decimal import Decimal

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """
    Middleware to add security headers that allow Google OAuth to work properly.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        
        # Remove or modify COOP header for OAuth endpoints
        if '/api/auth/' in request.path:
            # Allow cross-origin communication for OAuth
            response['Cross-Origin-Opener-Policy'] = 'same-origin-allow-popups'
            response['Cross-Origin-Embedder-Policy'] = 'unsafe-none'
            
        # Add permissive headers for development
        if hasattr(response, 'get') and response.get('Access-Control-Allow-Origin'):
            response['Cross-Origin-Resource-Policy'] = 'cross-origin'
            
        return response


class AutoBotExecutorMiddleware:
    """
    Middleware to automatically execute active trading bots in the background
    Runs bots every 5 seconds without needing a separate scheduler process
    """
    
    is_running = False
    executor_thread = None
    execution_interval = 5  # seconds
    
    def __init__(self, get_response):
        self.get_response = get_response
        # Start background thread on first initialization
        if not AutoBotExecutorMiddleware.is_running:
            self.start_background_executor()
    
    def __call__(self, request):
        response = self.get_response(request)
        return response
    
    @classmethod
    def start_background_executor(cls):
        """Start background thread for bot execution"""
        if cls.is_running:
            return
        
        cls.is_running = True
        cls.executor_thread = threading.Thread(
            target=cls.run_executor_loop,
            daemon=True,
            name='BotExecutorThread'
        )
        cls.executor_thread.start()
        logger.info('🤖 Auto Bot Executor started in background')
    
    @classmethod
    def run_executor_loop(cls):
        """Background loop that executes active bots"""
        while cls.is_running:
            try:
                from trading.bot_execution import BotExecutionService
                from trading.models import TradingBot, MarketData
                
                # Get active bots
                active_bots = TradingBot.objects.filter(status='ACTIVE')
                
                if active_bots.exists():
                    for bot in active_bots:
                        try:
                            # Use real-time price from MarketData (updated by frontend WebSocket)
                            market_data = MarketData.objects.filter(symbol=bot.symbol).first()
                            
                            if not market_data:
                                # Fallback: Create with base price if no data exists yet
                                symbol_base_prices = {
                                    'BTCUSDT': Decimal('124000.00'),
                                    'ETHUSDT': Decimal('4676.00'),
                                    'BNBUSDT': Decimal('693.00'),
                                    'XRPUSDT': Decimal('2.97'),
                                    'ADAUSDT': Decimal('1.15'),
                                    'SOLUSDT': Decimal('243.00'),
                                    'DOTUSDT': Decimal('18.50'),
                                    'SUIUSDT': Decimal('4.68'),
                                    'AVAXUSDT': Decimal('86.00'),
                                    'MATICUSDT': Decimal('1.12'),
                                    'LINKUSDT': Decimal('23.50'),
                                    'UNIUSDT': Decimal('13.80'),
                                    'ATOMUSDT': Decimal('17.20'),
                                    'LTCUSDT': Decimal('108.00'),
                                    'TRXUSDT': Decimal('0.44'),
                                }
                                base_price = symbol_base_prices.get(bot.symbol, Decimal('100.00'))
                                
                                market_data = MarketData.objects.create(
                                    symbol=bot.symbol,
                                    price=base_price,
                                    mark_price=base_price,
                                    price_change_24h=Decimal('0'),
                                    high_24h=base_price * Decimal('1.02'),
                                    low_24h=base_price * Decimal('0.98'),
                                    volume_24h=Decimal('1000000')
                                )
                            
                            # Use the real-time price from market data
                            current_price = market_data.price
                            
                            # Execute bot strategy
                            result = BotExecutionService.execute_bot_strategy(
                                bot,
                                market_data.price,
                                manual=False
                            )
                            
                            # Log important actions
                            action = result.get('action', '')
                            if action in ['OPENED_POSITION', 'CLOSED_POSITION']:
                                logger.info(f'Bot {bot.name}: {action} - {result.get("reason", "")}')
                                
                        except Exception as e:
                            logger.error(f'Error executing bot {bot.name}: {str(e)}')
                
                # Sleep for the interval
                time.sleep(cls.execution_interval)
                
            except Exception as e:
                logger.error(f'Bot executor loop error: {str(e)}')
                time.sleep(cls.execution_interval)
