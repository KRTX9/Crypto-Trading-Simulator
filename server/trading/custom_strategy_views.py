"""
Custom Strategy API Views
Allows users to upload, manage, and execute custom Python strategies
"""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from .custom_strategy_loader import CustomStrategyLoader
from .models import TradingAccount
from decimal import Decimal


class CustomStrategyUploadView(APIView):
    """Upload a custom trading strategy"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Upload custom strategy code"""
        strategy_name = request.data.get('name')
        code = request.data.get('code')
        
        if not strategy_name or not code:
            return Response(
                {'error': 'Strategy name and code are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Save the strategy
        result = CustomStrategyLoader.save_strategy(
            user_id=request.user.id,
            strategy_name=strategy_name,
            code=code
        )
        
        if result['success']:
            return Response({
                'success': True,
                'message': f'Strategy "{strategy_name}" uploaded successfully',
                'filename': result.get('filename')
            }, status=status.HTTP_201_CREATED)
        else:
            return Response(
                {'error': result.get('error')},
                status=status.HTTP_400_BAD_REQUEST
            )


class CustomStrategyListView(APIView):
    """List user's custom strategies"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get all custom strategies for the user"""
        strategies = CustomStrategyLoader.list_user_strategies(request.user.id)
        return Response(strategies)


class CustomStrategyDetailView(APIView):
    """Get or delete a custom strategy"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, strategy_name):
        """Delete a custom strategy"""
        success = CustomStrategyLoader.delete_strategy(
            user_id=request.user.id,
            strategy_name=strategy_name
        )
        
        if success:
            return Response({
                'success': True,
                'message': f'Strategy "{strategy_name}" deleted'
            })
        else:
            return Response(
                {'error': 'Strategy not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class CustomStrategyTemplateView(APIView):
    """Get template for creating custom strategies"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get strategy template"""
        template = CustomStrategyLoader.get_strategy_template()
        return Response({
            'template': template,
            'instructions': {
                'required': [
                    'A class with generate_signal(data, params) method',
                    'Return tuple of (signal, reason)',
                    'signal must be "BUY", "SELL", or None'
                ],
                'provided_data': [
                    'timestamp, open, high, low, close, volume',
                    'Technical indicators: sma_10, sma_20, sma_50',
                    'rsi, macd, macd_signal, bollinger_bands, etc.'
                ],
                'forbidden': [
                    'File operations (open, read, write)',
                    'System operations (os, sys, subprocess)',
                    'Dangerous functions (eval, exec, compile)',
                    'Network operations'
                ]
            }
        })


class CustomStrategyValidateView(APIView):
    """Validate custom strategy code before uploading"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Validate strategy code"""
        code = request.data.get('code')
        
        if not code:
            return Response(
                {'error': 'Code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = CustomStrategyLoader.validate_strategy_code(code)
        
        if result['valid']:
            return Response({
                'valid': True,
                'message': 'Strategy code is valid'
            })
        else:
            return Response({
                'valid': False,
                'error': result['error']
            }, status=status.HTTP_400_BAD_REQUEST)


class CustomStrategyTestView(APIView):
    """Test a custom strategy with sample data"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Test custom strategy"""
        strategy_name = request.data.get('strategy_name')
        params = request.data.get('parameters', {})
        
        if not strategy_name:
            return Response(
                {'error': 'Strategy name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Generate sample data for testing
        import pandas as pd
        import numpy as np
        from datetime import datetime, timedelta
        
        dates = pd.date_range(end=datetime.now(), periods=100, freq='1H')
        sample_data = pd.DataFrame({
            'timestamp': dates,
            'open': np.random.randn(100).cumsum() + 50000,
            'high': np.random.randn(100).cumsum() + 50100,
            'low': np.random.randn(100).cumsum() + 49900,
            'close': np.random.randn(100).cumsum() + 50000,
            'volume': np.random.randint(1000, 10000, 100)
        })
        
        # Calculate indicators
        from .bot_engine import StrategyEngine
        sample_data = StrategyEngine.calculate_indicators(sample_data)
        
        # Execute strategy
        signal, reason = CustomStrategyLoader.execute_custom_strategy(
            user_id=request.user.id,
            strategy_name=strategy_name,
            data=sample_data,
            params=params
        )
        
        return Response({
            'success': True,
            'signal': signal,
            'reason': reason,
            'test_data_points': len(sample_data)
        })
