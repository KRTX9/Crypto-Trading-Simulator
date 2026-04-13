from django.db import models
from django.contrib.auth import get_user_model
from decimal import Decimal
import uuid

User = get_user_model()

class TradingAccount(models.Model):
    """User's trading account with virtual balance"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trading_account')
    balance = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('50000.00000000'))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - Balance: ${self.balance}"
    
    @property
    def available_balance(self):
        """Calculate available balance (total - margin used)"""
        margin_used = sum(pos.margin for pos in self.positions.filter(status='OPEN'))
        return self.balance - Decimal(str(margin_used))
    
    @property
    def margin_used(self):
        """Total margin used across all open positions"""
        return sum(pos.margin for pos in self.positions.filter(status='OPEN'))
    
    @property
    def unrealized_pnl(self):
        """Total unrealized PnL across all open positions"""
        return sum(pos.unrealized_pnl for pos in self.positions.filter(status='OPEN'))
    
    @property
    def total_equity(self):
        """Total equity (balance + unrealized PnL)"""
        return self.balance + self.unrealized_pnl
    
    @property
    def margin_ratio(self):
        """Margin ratio as percentage"""
        if self.total_equity > 0:
            return (self.margin_used / self.total_equity) * 100
        return 0

class Position(models.Model):
    """User's trading positions"""
    SIDE_CHOICES = [
        ('LONG', 'Long'),
        ('SHORT', 'Short'),
    ]
    
    STATUS_CHOICES = [
        ('OPEN', 'Open'),
        ('CLOSED', 'Closed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(TradingAccount, on_delete=models.CASCADE, related_name='positions')
    symbol = models.CharField(max_length=20)  # e.g., BTCUSDT
    side = models.CharField(max_length=5, choices=SIDE_CHOICES)
    size = models.DecimalField(max_digits=20, decimal_places=8)  # Position size
    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    mark_price = models.DecimalField(max_digits=20, decimal_places=8, default=0)  # Current market price
    leverage = models.IntegerField(default=1)
    margin = models.DecimalField(max_digits=20, decimal_places=8)  # Margin used
    liquidation_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    stop_loss = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    take_profit = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='OPEN')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.account.user.username} - {self.symbol} {self.side} {self.size}"
    
    @property
    def unrealized_pnl(self):
        """Calculate unrealized PnL based on current mark price"""
        if self.status != 'OPEN' or self.mark_price == 0:
            return Decimal('0')
        
        price_diff = self.mark_price - self.entry_price
        if self.side == 'SHORT':
            price_diff = -price_diff
        
        return price_diff * self.size
    
    def update_mark_price(self, new_price):
        """Update mark price and check for stop loss/take profit triggers"""
        self.mark_price = Decimal(str(new_price))
        
        # Check stop loss trigger
        if self.stop_loss:
            if ((self.side == 'LONG' and new_price <= self.stop_loss) or 
                (self.side == 'SHORT' and new_price >= self.stop_loss)):
                return 'STOP_LOSS_TRIGGERED'
        
        # Check take profit trigger
        if self.take_profit:
            if ((self.side == 'LONG' and new_price >= self.take_profit) or 
                (self.side == 'SHORT' and new_price <= self.take_profit)):
                return 'TAKE_PROFIT_TRIGGERED'
        
        self.save()
        return 'UPDATED'

class Order(models.Model):
    """Trading orders"""
    SIDE_CHOICES = [
        ('BUY', 'Buy'),
        ('SELL', 'Sell'),
    ]
    
    TYPE_CHOICES = [
        ('MARKET', 'Market'),
        ('LIMIT', 'Limit'),
    ]
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('FILLED', 'Filled'),
        ('CANCELLED', 'Cancelled'),
        ('REJECTED', 'Rejected'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(TradingAccount, on_delete=models.CASCADE, related_name='orders')
    symbol = models.CharField(max_length=20)
    side = models.CharField(max_length=4, choices=SIDE_CHOICES)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)  # Null for market orders
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    filled_quantity = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    average_fill_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    leverage = models.IntegerField(default=1)
    reduce_only = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.account.user.username} - {self.symbol} {self.side} {self.quantity} @ {self.price or 'Market'}"

class Trade(models.Model):
    """Executed trades"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='trades')
    account = models.ForeignKey(TradingAccount, on_delete=models.CASCADE, related_name='trades')
    symbol = models.CharField(max_length=20)
    side = models.CharField(max_length=4, choices=Order.SIDE_CHOICES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    price = models.DecimalField(max_digits=20, decimal_places=8)
    commission = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    fee_rate = models.DecimalField(max_digits=10, decimal_places=6, default=Decimal('0.00055'))  # 0.055% Bybit rate
    realized_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    transaction_id = models.CharField(max_length=50, unique=True, null=True, blank=True)  # Bybit-style transaction ID
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.account.user.username} - {self.symbol} {self.side} {self.quantity} @ {self.price}"

class MarketData(models.Model):
    """Real-time market data cache"""
    symbol = models.CharField(max_length=20, unique=True)
    price = models.DecimalField(max_digits=20, decimal_places=8)
    mark_price = models.DecimalField(max_digits=20, decimal_places=8)
    price_change_24h = models.DecimalField(max_digits=10, decimal_places=4)
    high_24h = models.DecimalField(max_digits=20, decimal_places=8)
    low_24h = models.DecimalField(max_digits=20, decimal_places=8)
    volume_24h = models.DecimalField(max_digits=30, decimal_places=8)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['symbol']
    
    def __str__(self):
        return f"{self.symbol} - ${self.price}"

class UserSettings(models.Model):
    """User trading preferences and settings"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='trading_settings')
    default_leverage = models.IntegerField(default=10)
    risk_management = models.BooleanField(default=True)
    auto_close_positions = models.BooleanField(default=True)
    notifications_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.username} - Settings"

class TradingBot(models.Model):
    """AI-driven trading bot for automated strategy testing"""
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('PAUSED', 'Paused'),
        ('STOPPED', 'Stopped'),
    ]
    
    STRATEGY_CHOICES = [
        ('SMA_CROSSOVER', 'SMA Crossover'),
        ('RSI', 'RSI Strategy'),
        ('MACD', 'MACD Strategy'),
        ('BOLLINGER_BANDS', 'Bollinger Bands'),
        ('MEAN_REVERSION', 'Mean Reversion'),
        ('MOMENTUM', 'Momentum'),
        ('GRID', 'Grid Trading'),
        ('CUSTOM', 'Custom Strategy'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(TradingAccount, on_delete=models.CASCADE, related_name='bots')
    name = models.CharField(max_length=100)
    strategy = models.CharField(max_length=30, choices=STRATEGY_CHOICES)
    symbol = models.CharField(max_length=20)  # Trading pair
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PAUSED')
    
    # Strategy parameters (stored as JSON)
    parameters = models.JSONField(default=dict)
    
    # Timeframe for technical analysis (in minutes)
    timeframe = models.IntegerField(default=15, help_text="Timeframe in minutes (1, 5, 15, 30, 60, etc.)")
    
    # Risk management
    max_position_size = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('0.01'))
    take_profit_pct = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('2.0'), help_text="Take profit percentage")
    stop_loss_pct = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1.0'), help_text="Stop loss percentage")
    leverage = models.IntegerField(default=10)
    
    # Performance tracking
    total_trades = models.IntegerField(default=0)
    winning_trades = models.IntegerField(default=0)
    total_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_executed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.account.user.username} - {self.name} ({self.strategy})"
    
    @property
    def win_rate(self):
        """Calculate win rate percentage"""
        if self.total_trades == 0:
            return Decimal('0')
        return (Decimal(self.winning_trades) / Decimal(self.total_trades)) * Decimal('100')

class BotTrade(models.Model):
    """Trades executed by trading bots"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bot = models.ForeignKey(TradingBot, on_delete=models.CASCADE, related_name='bot_trades')
    account = models.ForeignKey(TradingAccount, on_delete=models.CASCADE, related_name='bot_trades')
    
    # Trade details
    symbol = models.CharField(max_length=20)
    side = models.CharField(max_length=4, choices=Order.SIDE_CHOICES)
    quantity = models.DecimalField(max_digits=20, decimal_places=8)
    entry_price = models.DecimalField(max_digits=20, decimal_places=8)
    exit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    
    # Automatic exit levels
    take_profit_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    stop_loss_price = models.DecimalField(max_digits=20, decimal_places=8, null=True, blank=True)
    
    # Performance
    realized_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    commission = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    
    # Status
    is_closed = models.BooleanField(default=False)
    
    # Signal information
    signal_reason = models.TextField(null=True, blank=True)  # Why the bot entered/exited
    
    entry_time = models.DateTimeField(auto_now_add=True)
    exit_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-entry_time']
    
    def __str__(self):
        return f"{self.bot.name} - {self.symbol} {self.side} {self.quantity}"

class BotPerformance(models.Model):
    """Daily performance snapshots for bots"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bot = models.ForeignKey(TradingBot, on_delete=models.CASCADE, related_name='performance_snapshots')
    
    # Daily metrics
    date = models.DateField()
    daily_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    trades_count = models.IntegerField(default=0)
    winning_trades_count = models.IntegerField(default=0)
    
    # Cumulative metrics
    cumulative_pnl = models.DecimalField(max_digits=20, decimal_places=8, default=0)
    total_trades = models.IntegerField(default=0)
    
    # Risk metrics
    max_drawdown = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sharpe_ratio = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-date']
        unique_together = ['bot', 'date']
    
    def __str__(self):
        return f"{self.bot.name} - {self.date}"
