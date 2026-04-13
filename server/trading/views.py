from rest_framework import status, generics
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db import transaction
from decimal import Decimal, InvalidOperation
from django.core.exceptions import ValidationError
from .models import TradingAccount, Position, Order, Trade, UserSettings, MarketData
from .serializers import (
    TradingAccountSerializer, PositionSerializer, OrderSerializer,
    CreateOrderSerializer, TradeSerializer, UserSettingsSerializer,
    ClosePositionSerializer, SetStopLossSerializer, SetTakeProfitSerializer,
    ResetAccountSerializer
)
from .pnl_calculator import PnLCalculator
from .order_execution import OrderExecutionService

# Helper functions now moved to OrderExecutionService

            


class AccountSummaryView(APIView):
    """Get user's trading account summary"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        account, created = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        serializer = TradingAccountSerializer(account)
        return Response(serializer.data)

class PositionsView(APIView):
    """Get user's positions"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        positions = Position.objects.filter(account=account, status='OPEN')
        serializer = PositionSerializer(positions, many=True)
        return Response(serializer.data)

class OrdersView(APIView):
    """Get user's orders"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        limit = int(request.query_params.get('limit', 50))
        orders = Order.objects.filter(account=account)[:limit]
        serializer = OrderSerializer(orders, many=True)
        return Response(serializer.data)
    
    def delete(self, request, order_id=None):
        """Cancel an order"""
        if not order_id:
            return Response({'error': 'Order ID required'}, status=status.HTTP_400_BAD_REQUEST)
        
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        # Use OrderExecutionService to cancel the order
        result = OrderExecutionService.cancel_order(order_id, account)
        
        if result['success']:
            return Response(result, status=status.HTTP_200_OK)
        else:
            # Determine appropriate status code
            if 'not found' in result.get('error', '').lower():
                return Response(result, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response(result, status=status.HTTP_400_BAD_REQUEST)

class TradesView(APIView):
    """Get user's trade history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        limit = int(request.query_params.get('limit', 50))
        trades = Trade.objects.filter(account=account)[:limit]
        serializer = TradeSerializer(trades, many=True)
        return Response(serializer.data)

class CreateOrderView(APIView):
    """Create a new trading order using optimized OrderExecutionService"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        # Get or create trading account
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        # Prepare order data
        order_data = {
            'symbol': request.data.get('symbol'),
            'side': request.data.get('side'),
            'type': request.data.get('type'),
            'quantity': request.data.get('quantity'),
            'price': request.data.get('price'),
            'leverage': request.data.get('leverage', 10),
            'reduce_only': request.data.get('reduce_only', False)
        }
        
        # Validate order parameters
        validation_result = OrderExecutionService.validate_order_params(order_data, account)
        if not validation_result['valid']:
            # Return first error as string for backward compatibility
            error_msg = validation_result['errors'][0] if validation_result['errors'] else 'Invalid order parameters'
            return Response(
                {'error': error_msg}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get current market price
        # Priority: Frontend real-time price > Database > Mock
        frontend_price = None
        if 'current_price' in request.data:
            try:
                frontend_price = Decimal(str(request.data['current_price']))
            except (ValueError, TypeError):
                pass
        
        current_price, price_source = OrderExecutionService.get_current_market_price(
            symbol=order_data['symbol'],
            frontend_price=frontend_price
        )
        
        # Execute order based on type
        try:
            if order_data['type'] == 'MARKET':
                result = OrderExecutionService.execute_market_order(
                    order_data=order_data,
                    account=account,
                    current_price=current_price
                )
            else:  # LIMIT
                result = OrderExecutionService.create_limit_order(
                    order_data=order_data,
                    account=account,
                    current_market_price=current_price
                )
            
            # Add additional info to response
            result['current_market_price'] = float(current_price)
            result['price_source'] = price_source
            result['symbol'] = order_data['symbol']
            
            return Response(result, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Order creation failed: {str(e)}")
            return Response(
                {'error': f'Order creation failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ClosePositionView(APIView):
    """Close a trading position with proper PnL calculation"""
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        from .pnl_calculator import PnLCalculator
        
        serializer = ClosePositionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        position = get_object_or_404(
            Position, 
            id=serializer.validated_data['position_id'],
            account=account,
            status='OPEN'
        )
        
        # Use current market price from position's mark_price (updated by real-time data)
        # If mark_price is not available, fall back to entry_price (no profit/loss)
        current_market_price = position.mark_price if position.mark_price else position.entry_price
        
        # Calculate realized PnL using the PnL calculator
        realized_pnl = PnLCalculator.calculate_realized_pnl(
            position, current_market_price, position.size
        )
        
        # Mark position as closed
        position.status = 'CLOSED'
        position.save()
        
        # Create closing order
        closing_side = 'SELL' if position.side == 'LONG' else 'BUY'
        order = Order.objects.create(
            account=account,
            symbol=position.symbol,
            side=closing_side,
            type='MARKET',
            quantity=position.size,
            leverage=position.leverage,
            reduce_only=True,
            status='FILLED',
            filled_quantity=position.size,
            average_fill_price=current_market_price
        )
        
        # Calculate commission
        commission = (position.size * current_market_price) * Decimal('0.00055')  # 0.055% commission (Bybit rate)
        
        # Create trade record with calculated realized PnL
        trade = Trade.objects.create(
            order=order,
            account=account,
            symbol=position.symbol,
            side=closing_side,
            quantity=position.size,
            price=current_market_price,
            commission=commission,
            realized_pnl=realized_pnl
        )
        
        # Update account balance
        account.balance += realized_pnl - commission
        account.save()
        
        return Response({
            'success': True,
            'message': 'Position closed successfully',
            'realized_pnl': float(realized_pnl),
            'trade_id': str(trade.id)
        })

class SetStopLossView(APIView):
    """Set stop loss for a position"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SetStopLossSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        position = get_object_or_404(
            Position,
            id=serializer.validated_data['position_id'],
            account=account,
            status='OPEN'
        )
        
        position.stop_loss = serializer.validated_data['stop_loss']
        position.save()
        
        return Response({
            'success': True,
            'message': 'Stop loss set successfully'
        })

class SetTakeProfitView(APIView):
    """Set take profit for a position"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = SetTakeProfitSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        position = get_object_or_404(
            Position,
            id=serializer.validated_data['position_id'],
            account=account,
            status='OPEN'
        )
        
        position.take_profit = serializer.validated_data['take_profit']
        position.save()
        
        return Response({
            'success': True,
            'message': 'Take profit set successfully'
        })

class ResetAccountView(APIView):
    """Reset user's trading account"""
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        serializer = ResetAccountSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        account, _ = TradingAccount.objects.get_or_create(
            user=request.user,
            defaults={'balance': Decimal('50000.00000000')}
        )
        
        # Close all open positions
        Position.objects.filter(account=account, status='OPEN').update(status='CLOSED')
        
        # Reset balance
        account.balance = Decimal('50000.00000000')
        account.save()
        
        return Response({
            'success': True,
            'message': 'Account reset successfully'
        })

class UserSettingsView(APIView):
    """Get/Update user trading settings"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings)
        return Response(serializer.data)
    
    def put(self, request):
        settings, _ = UserSettings.objects.get_or_create(user=request.user)
        serializer = UserSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class UpdateMarketPriceView(APIView):
    """Update market price and check limit orders (for real-time price updates)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        symbol = request.data.get('symbol')
        price = request.data.get('price')
        
        if not symbol or not price:
            return Response({'error': 'Symbol and price required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            current_price = Decimal(str(price))
            
            # Update or create market data with all required fields
            MarketData.objects.update_or_create(
                symbol=symbol,
                defaults={
                    'price': current_price,
                    'mark_price': current_price,
                    'price_change_24h': Decimal('0'),  # Default to 0 for now
                    'high_24h': current_price,
                    'low_24h': current_price,
                    'volume_24h': Decimal('0')
                }
            )
            
            # Update mark prices for all open positions of this symbol
            account, _ = TradingAccount.objects.get_or_create(
                user=request.user,
                defaults={'balance': Decimal('50000.00000000')}
            )
            
            positions_updated = Position.objects.filter(
                account=account,
                symbol=symbol,
                status='OPEN'
            ).update(mark_price=current_price)
            
            # Check and execute any pending limit orders using OrderExecutionService
            executed_orders = OrderExecutionService.check_and_execute_pending_limits(symbol, current_price)
            
            return Response({
                'success': True, 
                'message': f'Price updated for {symbol}',
                'positions_updated': positions_updated,
                'executed_limit_orders': len(executed_orders),
                'executed_orders': executed_orders
            })
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Price update failed: {str(e)}")
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class StreamStatusView(APIView):
    """Monitor Redis Streams health"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            import redis
            import os
            
            # Get Redis connection
            redis_host = os.getenv('REDIS_HOST', 'localhost')
            redis_port = int(os.getenv('REDIS_PORT', 6379))
            redis_client = redis.Redis(
                host=redis_host,
                port=redis_port,
                decode_responses=True
            )
            
            stream_name = "futures:prices:stream"
            
            # Get stream info
            info = redis_client.xinfo_stream(stream_name)
            groups = redis_client.xinfo_groups(stream_name)
            
            # Get latest price samples
            latest_entries = redis_client.xrevrange(stream_name, count=5)
            
            return Response({
                'status': 'healthy',
                'stream_length': info['length'],
                'consumer_groups': len(groups),
                'first_entry_id': info['first-entry'],
                'last_entry_id': info['last-generated-id'],
                'groups': [
                    {
                        'name': g['name'],
                        'consumers': g['consumers'],
                        'pending': g['pending']
                    } for g in groups
                ],
                'latest_prices': [
                    {
                        'id': entry_id,
                        'symbol': data.get('symbol'),
                        'price': data.get('price')
                    } for entry_id, data in latest_entries
                ]
            })
        except redis.ResponseError as e:
            return Response({
                'status': 'error',
                'error': f'Stream not found or not initialized: {str(e)}'
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        except Exception as e:
            return Response({
                'status': 'error',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
