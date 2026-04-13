"""
Price Sync API - Receives real-time prices from frontend Binance WebSocket
and updates MarketData for bot execution
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from decimal import Decimal
from .models import MarketData


class UpdateMarketPricesView(APIView):
    """
    Receive real-time prices from frontend and update database
    Frontend WebSocket will POST to this endpoint every few seconds
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Update multiple market prices from frontend WebSocket data
        
        Expected format:
        {
            "prices": {
                "BTCUSDT": {"price": 124000.50, "high": 125000, "low": 123000, "volume": 1000000},
                "ETHUSDT": {"price": 4676.20, "high": 4700, "low": 4650, "volume": 500000},
                ...
            }
        }
        """
        try:
            prices_data = request.data.get('prices', {})
            
            if not prices_data:
                return Response(
                    {'error': 'No price data provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            updated_count = 0
            
            for symbol, data in prices_data.items():
                try:
                    price = Decimal(str(data.get('price', 0)))
                    
                    if price <= 0:
                        continue
                    
                    # Update or create market data
                    MarketData.objects.update_or_create(
                        symbol=symbol,
                        defaults={
                            'price': price,
                            'mark_price': price,
                            'high_24h': Decimal(str(data.get('high', price * Decimal('1.02')))),
                            'low_24h': Decimal(str(data.get('low', price * Decimal('0.98')))),
                            'volume_24h': Decimal(str(data.get('volume', 1000000))),
                            'price_change_24h': Decimal(str(data.get('priceChangePercent', 0))),
                        }
                    )
                    updated_count += 1
                    
                except Exception as e:
                    print(f"Error updating {symbol}: {str(e)}")
                    continue
            
            return Response({
                'success': True,
                'updated': updated_count,
                'message': f'Updated {updated_count} market prices'
            })
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class GetCurrentPricesView(APIView):
    """Get current market prices from database"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Return all current market prices"""
        market_data = MarketData.objects.all()
        
        prices = {
            md.symbol: {
                'price': float(md.price),
                'mark_price': float(md.mark_price),
                'high_24h': float(md.high_24h),
                'low_24h': float(md.low_24h),
                'volume_24h': float(md.volume_24h),
                'price_change_24h': float(md.price_change_24h),
                'updated_at': md.updated_at.isoformat()
            }
            for md in market_data
        }
        
        return Response({
            'success': True,
            'prices': prices,
            'count': len(prices)
        })
