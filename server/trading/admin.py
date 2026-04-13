from django.contrib import admin
from .models import TradingAccount, Position, Order, Trade, MarketData, UserSettings

@admin.register(TradingAccount)
class TradingAccountAdmin(admin.ModelAdmin):
    list_display = ['user', 'balance', 'available_balance', 'margin_used', 'total_equity', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['available_balance', 'margin_used', 'unrealized_pnl', 'total_equity', 'margin_ratio']

@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ['account', 'symbol', 'side', 'size', 'entry_price', 'mark_price', 'unrealized_pnl', 'status', 'created_at']
    list_filter = ['symbol', 'side', 'status', 'created_at']
    search_fields = ['account__user__username', 'symbol']
    readonly_fields = ['id', 'unrealized_pnl']

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['account', 'symbol', 'side', 'type', 'quantity', 'price', 'status', 'created_at']
    list_filter = ['symbol', 'side', 'type', 'status', 'created_at']
    search_fields = ['account__user__username', 'symbol']
    readonly_fields = ['id']

@admin.register(Trade)
class TradeAdmin(admin.ModelAdmin):
    list_display = ['account', 'symbol', 'side', 'quantity', 'price', 'commission', 'realized_pnl', 'created_at']
    list_filter = ['symbol', 'side', 'created_at']
    search_fields = ['account__user__username', 'symbol']
    readonly_fields = ['id']

@admin.register(MarketData)
class MarketDataAdmin(admin.ModelAdmin):
    list_display = ['symbol', 'price', 'price_change_24h', 'volume_24h', 'updated_at']
    list_filter = ['updated_at']
    search_fields = ['symbol']

@admin.register(UserSettings)
class UserSettingsAdmin(admin.ModelAdmin):
    list_display = ['user', 'default_leverage', 'risk_management', 'auto_close_positions', 'notifications_enabled']
    list_filter = ['risk_management', 'auto_close_positions', 'notifications_enabled']
    search_fields = ['user__username', 'user__email']