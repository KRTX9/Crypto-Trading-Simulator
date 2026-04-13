from rest_framework import serializers
from .models import (
    TradingAccount, Position, Order, Trade, MarketData, UserSettings,
    TradingBot, BotTrade, BotPerformance
)
from decimal import Decimal

class TradingAccountSerializer(serializers.ModelSerializer):
    available_balance = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    margin_used = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    unrealized_pnl = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    total_equity = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    margin_ratio = serializers.DecimalField(max_digits=10, decimal_places=4, read_only=True)
    
    class Meta:
        model = TradingAccount
        fields = [
            'balance', 'available_balance', 'margin_used', 
            'unrealized_pnl', 'total_equity', 'margin_ratio',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class PositionSerializer(serializers.ModelSerializer):
    unrealized_pnl = serializers.DecimalField(max_digits=20, decimal_places=8, read_only=True)
    
    class Meta:
        model = Position
        fields = [
            'id', 'symbol', 'side', 'size', 'entry_price', 'mark_price',
            'leverage', 'margin', 'liquidation_price', 'stop_loss', 'take_profit',
            'unrealized_pnl', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'mark_price', 'unrealized_pnl', 'created_at', 'updated_at']

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = [
            'id', 'symbol', 'side', 'type', 'quantity', 'price',
            'status', 'filled_quantity', 'average_fill_price', 'leverage',
            'reduce_only', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'filled_quantity', 'average_fill_price',
            'created_at', 'updated_at'
        ]

class CreateOrderSerializer(serializers.Serializer):
    symbol = serializers.CharField(max_length=20)
    side = serializers.ChoiceField(choices=Order.SIDE_CHOICES)
    type = serializers.ChoiceField(choices=Order.TYPE_CHOICES)
    quantity = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal('0.00000001'))
    price = serializers.DecimalField(max_digits=20, decimal_places=8, required=False, allow_null=True)
    current_price = serializers.DecimalField(max_digits=20, decimal_places=8, required=False, allow_null=True)  # Current market price
    leverage = serializers.IntegerField(min_value=1, max_value=100, default=10)
    reduce_only = serializers.BooleanField(default=False)
    
    def validate(self, data):
        if data['type'] == 'LIMIT' and not data.get('price'):
            raise serializers.ValidationError("Price is required for limit orders")
        return data

class TradeSerializer(serializers.ModelSerializer):
    order_id = serializers.UUIDField(source='order.id', read_only=True)
    fee_rate_percent = serializers.SerializerMethodField()
    
    class Meta:
        model = Trade
        fields = [
            'id', 'order_id', 'symbol', 'side', 'quantity', 'price',
            'commission', 'fee_rate', 'fee_rate_percent', 'transaction_id',
            'realized_pnl', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_fee_rate_percent(self, obj):
        """Convert fee rate to percentage for display"""
        return float(obj.fee_rate * 100)

class MarketDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = MarketData
        fields = [
            'symbol', 'price', 'mark_price', 'price_change_24h',
            'high_24h', 'low_24h', 'volume_24h', 'updated_at'
        ]
        read_only_fields = ['updated_at']

class UserSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserSettings
        fields = [
            'default_leverage', 'risk_management', 'auto_close_positions',
            'notifications_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

class ClosePositionSerializer(serializers.Serializer):
    position_id = serializers.UUIDField()

class SetStopLossSerializer(serializers.Serializer):
    position_id = serializers.UUIDField()
    stop_loss = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal('0'))

class SetTakeProfitSerializer(serializers.Serializer):
    position_id = serializers.UUIDField()
    take_profit = serializers.DecimalField(max_digits=20, decimal_places=8, min_value=Decimal('0'))

class ResetAccountSerializer(serializers.Serializer):
    confirm = serializers.BooleanField(default=False)
    
    def validate_confirm(self, value):
        if not value:
            raise serializers.ValidationError("Account reset must be confirmed")
        return value

# Bot Serializers

class TradingBotSerializer(serializers.ModelSerializer):
    win_rate = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    account_username = serializers.CharField(source='account.user.username', read_only=True)
    
    class Meta:
        model = TradingBot
        fields = [
            'id', 'name', 'strategy', 'symbol', 'status', 'parameters', 'timeframe',
            'max_position_size', 'take_profit_pct', 'stop_loss_pct', 'leverage',
            'total_trades', 'winning_trades', 'win_rate', 'total_pnl',
            'created_at', 'updated_at', 'last_executed_at', 'account_username'
        ]
        read_only_fields = [
            'id', 'total_trades', 'winning_trades', 'total_pnl',
            'created_at', 'updated_at', 'last_executed_at'
        ]

class CreateBotSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100)
    strategy = serializers.ChoiceField(choices=TradingBot.STRATEGY_CHOICES)
    symbol = serializers.CharField(max_length=20)
    parameters = serializers.JSONField(default=dict)
    timeframe = serializers.IntegerField(min_value=1, default=15, help_text="Timeframe in minutes (1, 5, 15, 30, 60, etc.)")
    max_position_size = serializers.DecimalField(
        max_digits=20, 
        decimal_places=8, 
        default=Decimal('0.01')
    )
    take_profit_pct = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('2.0'),
        help_text="Take profit percentage"
    )
    stop_loss_pct = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('1.0'),
        help_text="Stop loss percentage"
    )
    leverage = serializers.IntegerField(min_value=1, max_value=125, default=10)

class UpdateBotSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=100, required=False)
    strategy = serializers.ChoiceField(
        choices=TradingBot.STRATEGY_CHOICES,
        required=False
    )
    symbol = serializers.CharField(max_length=20, required=False)
    parameters = serializers.JSONField(required=False)
    max_position_size = serializers.DecimalField(
        max_digits=20, 
        decimal_places=8, 
        required=False
    )
    take_profit_pct = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        required=False
    )
    stop_loss_pct = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        required=False
    )
    leverage = serializers.IntegerField(min_value=1, max_value=125, required=False)
    status = serializers.ChoiceField(
        choices=TradingBot.STATUS_CHOICES, 
        required=False
    )

class BotTradeSerializer(serializers.ModelSerializer):
    bot_name = serializers.CharField(source='bot.name', read_only=True)
    duration = serializers.SerializerMethodField()
    
    class Meta:
        model = BotTrade
        fields = [
            'id', 'bot_name', 'symbol', 'side', 'quantity',
            'entry_price', 'exit_price', 'realized_pnl', 'commission',
            'is_closed', 'signal_reason', 'entry_time', 'exit_time', 'duration'
        ]
        read_only_fields = ['id', 'entry_time', 'exit_time']
    
    def get_duration(self, obj):
        """Calculate trade duration in minutes"""
        if obj.exit_time and obj.entry_time:
            duration = obj.exit_time - obj.entry_time
            return int(duration.total_seconds() / 60)
        return None

class BotPerformanceSerializer(serializers.ModelSerializer):
    bot_name = serializers.CharField(source='bot.name', read_only=True)
    
    class Meta:
        model = BotPerformance
        fields = [
            'id', 'bot_name', 'date', 'daily_pnl', 'trades_count',
            'winning_trades_count', 'cumulative_pnl', 'total_trades',
            'max_drawdown', 'sharpe_ratio', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class BacktestRequestSerializer(serializers.Serializer):
    strategy = serializers.ChoiceField(choices=TradingBot.STRATEGY_CHOICES)
    symbol = serializers.CharField(max_length=20)
    parameters = serializers.JSONField(default=dict)
    initial_capital = serializers.DecimalField(
        max_digits=20, 
        decimal_places=8, 
        default=Decimal('10000')
    )

class AnalyticsResponseSerializer(serializers.Serializer):
    """Serializer for analytics API responses"""
    total_trades = serializers.IntegerField()
    winning_trades = serializers.IntegerField()
    losing_trades = serializers.IntegerField()
    win_rate = serializers.FloatField()
    total_pnl = serializers.FloatField()
    net_pnl = serializers.FloatField(required=False)
    profit_factor = serializers.FloatField()
    sharpe_ratio = serializers.FloatField()
    max_drawdown = serializers.FloatField()
    roi = serializers.FloatField(required=False)
    daily_pnl = serializers.ListField(required=False)
