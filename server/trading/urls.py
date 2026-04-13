from django.urls import path
from .views import (
    AccountSummaryView, PositionsView, OrdersView, TradesView,
    CreateOrderView, ClosePositionView, SetStopLossView, SetTakeProfitView,
    ResetAccountView, UserSettingsView, UpdateMarketPriceView, StreamStatusView
)
from .bot_views import (
    BotListView, BotDetailView, BotControlView, BotExecuteView,
    BotTradesView, BotPerformanceView, BacktestView,
    AnalyticsDashboardView, RiskMetricsView, ComparisonAnalyticsView,
    StrategyListView
)
from .custom_strategy_views import (
    CustomStrategyUploadView, CustomStrategyListView, CustomStrategyDetailView,
    CustomStrategyTemplateView, CustomStrategyValidateView, CustomStrategyTestView
)
from .price_sync_views import (
    UpdateMarketPricesView, GetCurrentPricesView
)

urlpatterns = [
    # Account management
    path('account/', AccountSummaryView.as_view(), name='account_summary'),
    path('account/reset/', ResetAccountView.as_view(), name='reset_account'),
    
    # Trading data
    path('positions/', PositionsView.as_view(), name='positions'),
    path('orders/', OrdersView.as_view(), name='orders'),
    path('trades/', TradesView.as_view(), name='trades'),
    
    # Trading actions
    path('orders/create/', CreateOrderView.as_view(), name='create_order'),
    path('orders/<uuid:order_id>/', OrdersView.as_view(), name='cancel_order'),
    path('positions/close/', ClosePositionView.as_view(), name='close_position'),
    path('positions/stop-loss/', SetStopLossView.as_view(), name='set_stop_loss'),
    path('positions/take-profit/', SetTakeProfitView.as_view(), name='set_take_profit'),
    
    # User settings
    path('settings/', UserSettingsView.as_view(), name='user_settings'),
    
    # Market data
    path('market/update-price/', UpdateMarketPriceView.as_view(), name='update_market_price'),
    path('market/sync-prices/', UpdateMarketPricesView.as_view(), name='sync_market_prices'),  # Deprecated - use Redis Streams
    path('market/prices/', GetCurrentPricesView.as_view(), name='get_current_prices'),
    path('market/stream-status/', StreamStatusView.as_view(), name='stream_status'),
    
    # Bot Management
    path('bots/', BotListView.as_view(), name='bot_list'),
    path('bots/<uuid:bot_id>/', BotDetailView.as_view(), name='bot_detail'),
    path('bots/<uuid:bot_id>/execute/', BotExecuteView.as_view(), name='bot_execute'),
    path('bots/<uuid:bot_id>/trades/', BotTradesView.as_view(), name='bot_trades'),
    path('bots/<uuid:bot_id>/performance/', BotPerformanceView.as_view(), name='bot_performance'),
    path('bots/<uuid:bot_id>/<str:action>/', BotControlView.as_view(), name='bot_control'),
    
    # Backtesting
    path('backtest/', BacktestView.as_view(), name='backtest'),
    path('strategies/', StrategyListView.as_view(), name='strategy_list'),
    
    # Analytics
    path('analytics/dashboard/', AnalyticsDashboardView.as_view(), name='analytics_dashboard'),
    path('analytics/risk/', RiskMetricsView.as_view(), name='risk_metrics'),
    path('analytics/comparison/', ComparisonAnalyticsView.as_view(), name='comparison_analytics'),
    
    # Custom Strategies
    path('custom-strategies/', CustomStrategyListView.as_view(), name='custom_strategy_list'),
    path('custom-strategies/upload/', CustomStrategyUploadView.as_view(), name='custom_strategy_upload'),
    path('custom-strategies/template/', CustomStrategyTemplateView.as_view(), name='custom_strategy_template'),
    path('custom-strategies/validate/', CustomStrategyValidateView.as_view(), name='custom_strategy_validate'),
    path('custom-strategies/test/', CustomStrategyTestView.as_view(), name='custom_strategy_test'),
    path('custom-strategies/<str:strategy_name>/', CustomStrategyDetailView.as_view(), name='custom_strategy_detail'),
]
