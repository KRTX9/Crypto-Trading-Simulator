"""
Order Execution Service
Handles market and limit order execution with real-time price integration
"""
from decimal import Decimal
from typing import Dict, Optional, Tuple, Any
from django.db import transaction
from django.core.exceptions import ValidationError
import logging
import secrets
from .models import Order, Position, Trade, TradingAccount, MarketData

logger = logging.getLogger(__name__)


class OrderExecutionService:
    """Service for executing market and limit orders"""
    
    # Commission rate (Bybit rate)
    COMMISSION_RATE = Decimal('0.00055')  # 0.055%
    
    # Maintenance margin rate
    MAINTENANCE_MARGIN_RATE = Decimal('0.004')  # 0.4%
    
    @classmethod
    def validate_order_params(cls, order_data: Dict, account: TradingAccount) -> Dict:
        """
        Validate order parameters
        Returns: Dict with 'valid' bool and 'errors' list
        """
        errors = []
        
        # Required fields
        required_fields = ['symbol', 'side', 'type', 'quantity', 'leverage']
        for field in required_fields:
            if field not in order_data or not order_data[field]:
                errors.append(f"{field} is required")
        
        if errors:
            return {'valid': False, 'errors': errors}
        
        # Validate quantity
        try:
            quantity = Decimal(str(order_data['quantity']))
            if quantity <= 0:
                errors.append("Quantity must be positive")
            
            # Add reasonable max quantity limits per symbol to prevent mistakes
            symbol = order_data.get('symbol', '')
            max_quantities = {
                'BTCUSDT': Decimal('100'),       # Max 100 BTC
                'ETHUSDT': Decimal('1000'),      # Max 1000 ETH
                'XRPUSDT': Decimal('1000000'),   # Max 1M XRP
                'ADAUSDT': Decimal('1000000'),   # Max 1M ADA
                'BNBUSDT': Decimal('1000'),      # Max 1000 BNB
                'DOTUSDT': Decimal('100000'),    # Max 100k DOT
                'SOLUSDT': Decimal('10000'),     # Max 10k SOL
                'SUIUSDT': Decimal('500000'),    # Max 500k SUI
                'DOGEUSDT': Decimal('5000000'),  # Max 5M DOGE
                'LINKUSDT': Decimal('50000'),    # Max 50k LINK
                'XLMUSDT': Decimal('1000000'),   # Max 1M XLM
                'LTCUSDT': Decimal('10000'),     # Max 10k LTC
            }
            
            max_qty = max_quantities.get(symbol, Decimal('10000'))
            if quantity > max_qty:
                errors.append(f"Quantity {quantity} exceeds maximum allowed ({max_qty}) for {symbol}")
                
        except (ValueError, TypeError):
            errors.append("Invalid quantity format")
            return {'valid': False, 'errors': errors}
        
        # Validate leverage
        try:
            leverage = int(order_data['leverage'])
            if leverage < 1 or leverage > 125:
                errors.append("Leverage must be between 1 and 125")
        except (ValueError, TypeError):
            errors.append("Invalid leverage format")
            return {'valid': False, 'errors': errors}
        
        # Validate side
        if order_data['side'] not in ['BUY', 'SELL']:
            errors.append("Side must be BUY or SELL")
        
        # Validate order type
        if order_data['type'] not in ['MARKET', 'LIMIT']:
            errors.append("Type must be MARKET or LIMIT")
        
        # For limit orders, validate price
        if order_data['type'] == 'LIMIT':
            if 'price' not in order_data or not order_data['price']:
                errors.append("Price is required for limit orders")
            else:
                try:
                    price = Decimal(str(order_data['price']))
                    if price <= 0:
                        errors.append("Price must be positive")
                except (ValueError, TypeError):
                    errors.append("Invalid price format")
        
        return {'valid': not bool(errors), 'errors': errors}
    
    @classmethod
    def get_current_market_price(cls, symbol: str, frontend_price: Optional[Decimal] = None) -> Tuple[Decimal, str]:
        """
        Get current market price for a symbol
        Priority: Frontend realtime > Database > Mock fallback
        Returns: (price, source)
        """
        # Priority 1: Frontend provided price (real-time from WebSocket)
        if frontend_price and frontend_price > 0:
            logger.info(f"Using frontend realtime price for {symbol}: {frontend_price}")
            return frontend_price, "frontend_realtime"
        
        # Priority 2: Database market data
        try:
            market_data = MarketData.objects.get(symbol=symbol)
            if market_data.price > 0:
                logger.info(f"Using database price for {symbol}: {market_data.price}")
                return market_data.price, "database"
        except MarketData.DoesNotExist:
            pass
        
        # Priority 3: Mock prices (development fallback - realistic as of 2024)
        mock_prices = {
            'BTCUSDT': Decimal('65000'),  # Bitcoin
            'ETHUSDT': Decimal('3500'),    # Ethereum  
            'XRPUSDT': Decimal('0.52'),    # XRP
            'ADAUSDT': Decimal('0.45'),    # Cardano
            'BNBUSDT': Decimal('600'),     # BNB
            'DOTUSDT': Decimal('6.5'),     # Polkadot
            'SOLUSDT': Decimal('150'),     # Solana
            'SUIUSDT': Decimal('2.0'),     # SUI (corrected from 1.2)
            'DOGEUSDT': Decimal('0.08'),   # Dogecoin
            'LINKUSDT': Decimal('14.5'),   # Chainlink
            'XLMUSDT': Decimal('0.12'),    # Stellar
            'LTCUSDT': Decimal('70.0'),    # Litecoin
        }
        
        price = mock_prices.get(symbol, Decimal('100'))
        logger.warning(f"Using mock fallback price for {symbol}: {price}")
        return price, "mock_fallback"
    
    @classmethod
    def calculate_margin_requirements(cls, quantity: Decimal, price: Decimal, leverage: int) -> Dict:
        """Calculate margin requirements for an order"""
        notional_value = quantity * price
        margin_required = notional_value / leverage
        commission = notional_value * cls.COMMISSION_RATE
        
        return {
            'notional_value': notional_value,
            'margin_required': margin_required,
            'commission': commission,
            'total_cost': margin_required + commission
        }
    
    @classmethod
    def calculate_liquidation_price(cls, entry_price: Decimal, side: str, leverage: int) -> Decimal:
        """Calculate liquidation price for a position"""
        if side == 'LONG':
            return entry_price * (1 - Decimal('1') / leverage + cls.MAINTENANCE_MARGIN_RATE)
        else:  # SHORT
            return entry_price * (1 + Decimal('1') / leverage - cls.MAINTENANCE_MARGIN_RATE)
    
    @classmethod
    @transaction.atomic
    def execute_market_order(cls, order_data: Dict, account: TradingAccount, current_price: Decimal) -> Dict:
        """Execute a market order immediately"""
        
        quantity = Decimal(str(order_data['quantity']))
        leverage = int(order_data['leverage'])
        symbol = order_data['symbol']
        side = order_data['side']
        
        # Calculate requirements
        requirements = cls.calculate_margin_requirements(quantity, current_price, leverage)
        
        # Check balance
        if account.available_balance < requirements['total_cost']:
            raise ValidationError(f"Insufficient balance. Required: ${requirements['total_cost']:.2f}, Available: ${account.available_balance:.2f}")
        
        # Create and fill order
        order = Order.objects.create(
            account=account,
            symbol=symbol,
            side=side,
            type='MARKET',
            quantity=quantity,
            price=current_price,
            leverage=leverage,
            status='FILLED',
            filled_quantity=quantity,
            average_fill_price=current_price,
            reduce_only=order_data.get('reduce_only', False)
        )
        
        # Handle position logic
        position_result = cls._handle_position_update(
            account=account,
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=current_price,
            leverage=leverage,
            commission=requirements['commission']
        )
        
        # Create trade record
        trade = Trade.objects.create(
            order=order,
            account=account,
            symbol=symbol,
            side=side,
            quantity=quantity,
            price=current_price,
            commission=requirements['commission'],
            fee_rate=cls.COMMISSION_RATE,
            realized_pnl=position_result['realized_pnl'],
            transaction_id=secrets.token_hex(4)
        )
        
        logger.info(f"Market order executed: {symbol} {side} {quantity} @ {current_price}")
        
        return {
            'success': True,
            'order_id': str(order.id),
            'execution_price': float(current_price),
            'commission': float(requirements['commission']),
            'realized_pnl': float(position_result['realized_pnl']),
            'position_action': position_result['action']
        }
    
    @classmethod
    @transaction.atomic
    def create_limit_order(cls, order_data: Dict, account: TradingAccount, current_market_price: Decimal) -> Dict:
        """Create a limit order (may execute immediately if price conditions are met)"""
        
        quantity = Decimal(str(order_data['quantity']))
        limit_price = Decimal(str(order_data['price']))
        leverage = int(order_data['leverage'])
        symbol = order_data['symbol']
        side = order_data['side']
        
        # Calculate requirements based on limit price
        requirements = cls.calculate_margin_requirements(quantity, limit_price, leverage)
        
        # Check balance
        if account.available_balance < requirements['total_cost']:
            raise ValidationError(f"Insufficient balance. Required: ${requirements['total_cost']:.2f}, Available: ${account.available_balance:.2f}")
        
        # Check if limit order should execute immediately
        should_execute = cls._should_execute_limit_order(side, limit_price, current_market_price)
        
        if should_execute:
            # Execute immediately at limit price (better price for user)
            order = Order.objects.create(
                account=account,
                symbol=symbol,
                side=side,
                type='LIMIT',
                quantity=quantity,
                price=limit_price,
                leverage=leverage,
                status='FILLED',
                filled_quantity=quantity,
                average_fill_price=limit_price,
                reduce_only=order_data.get('reduce_only', False)
            )
            
            # Handle position logic
            position_result = cls._handle_position_update(
                account=account,
                symbol=symbol,
                side=side,
                quantity=quantity,
                price=limit_price,
                leverage=leverage,
                commission=requirements['commission']
            )
            
            # Create trade record
            trade = Trade.objects.create(
                order=order,
                account=account,
                symbol=symbol,
                side=side,
                quantity=quantity,
                price=limit_price,
                commission=requirements['commission'],
                fee_rate=cls.COMMISSION_RATE,
                realized_pnl=position_result['realized_pnl'],
                transaction_id=secrets.token_hex(4)
            )
            
            logger.info(f"Limit order executed immediately: {symbol} {side} {quantity} @ {limit_price}")
            
            return {
                'success': True,
                'order_id': str(order.id),
                'status': 'FILLED',
                'execution_price': float(limit_price),
                'message': f'Limit order filled immediately at {limit_price}'
            }
        else:
            # Create pending limit order
            order = Order.objects.create(
                account=account,
                symbol=symbol,
                side=side,
                type='LIMIT',
                quantity=quantity,
                price=limit_price,
                leverage=leverage,
                status='PENDING',
                reduce_only=order_data.get('reduce_only', False)
            )
            
            logger.info(f"Limit order created (pending): {symbol} {side} {quantity} @ {limit_price}")
            
            return {
                'success': True,
                'order_id': str(order.id),
                'status': 'PENDING',
                'limit_price': float(limit_price),
                'message': f'Limit order placed: {side} {quantity} {symbol} @ ${limit_price}'
            }
    
    @classmethod
    def _should_execute_limit_order(cls, side: str, limit_price: Decimal, market_price: Decimal, 
                                   is_pending: bool = False) -> bool:
        """Check if limit order should execute based on current market price
        
        Args:
            is_pending: True if checking existing pending order, False for new order
        
        For new orders: Always create as pending (simulation behavior)
        For pending orders: Execute when price reaches limit
        """
        if not is_pending:
            # New limit orders always start as pending (order book simulation)
            logger.info(f"New limit order will be created as pending: {side} @ ${limit_price}")
            return False
        
        # For existing pending orders, check if price has been reached
        if side == 'BUY':
            # BUY limit executes when market price drops to or below limit
            should_execute = market_price <= limit_price
            if should_execute:
                logger.info(f"BUY Limit TRIGGERED: Market ${market_price} <= Limit ${limit_price}")
            return should_execute
        else:  # SELL
            # SELL limit executes when market price rises to or above limit  
            should_execute = market_price >= limit_price
            if should_execute:
                logger.info(f"SELL Limit TRIGGERED: Market ${market_price} >= Limit ${limit_price}")
            return should_execute
    
    @classmethod
    @transaction.atomic
    def _handle_position_update(cls, account: TradingAccount, symbol: str, side: str, 
                                quantity: Decimal, price: Decimal, leverage: int, 
                                commission: Decimal) -> Dict:
        """Handle position creation, increase, or closure"""
        
        # Find existing open positions for this symbol
        existing_positions = Position.objects.filter(
            account=account,
            symbol=symbol,
            status='OPEN'
        ).order_by('created_at')
        
        realized_pnl = Decimal('0')
        action = 'new'
        
        # Determine position side from order side
        position_side = 'LONG' if side == 'BUY' else 'SHORT'
        
        # Find opposite positions (for closing)
        opposite_positions = existing_positions.filter(
            side='SHORT' if position_side == 'LONG' else 'LONG'
        )
        
        # Find same-side positions (for increasing)
        same_positions = existing_positions.filter(side=position_side)
        
        # Handle closing opposite positions first
        remaining_quantity = quantity
        for position in opposite_positions:
            if remaining_quantity <= 0:
                break
            
            close_quantity = min(remaining_quantity, position.size)
            
            # Calculate realized PnL
            if position.side == 'LONG':
                realized_pnl += (price - position.entry_price) * close_quantity
            else:  # SHORT
                realized_pnl += (position.entry_price - price) * close_quantity
            
            if close_quantity >= position.size:
                # Close entire position
                position.status = 'CLOSED'
                position.save()
                action = 'closed'
            else:
                # Partially close position
                position.size -= close_quantity
                position.margin = (position.size * position.entry_price) / leverage
                position.save()
                action = 'reduced'
            
            remaining_quantity -= close_quantity
        
        # If there's remaining quantity, either increase existing position or create new
        if remaining_quantity > 0:
            if same_positions.exists():
                # Increase existing position (use first one)
                position = same_positions.first()
                
                # Calculate new average entry price
                total_cost = (position.size * position.entry_price) + (remaining_quantity * price)
                new_size = position.size + remaining_quantity
                new_entry_price = total_cost / new_size
                
                position.size = new_size
                position.entry_price = new_entry_price
                position.margin = total_cost / leverage
                position.mark_price = price
                position.liquidation_price = cls.calculate_liquidation_price(
                    new_entry_price, position.side, leverage
                )
                position.save()
                action = 'increased'
            else:
                # Create new position
                Position.objects.create(
                    account=account,
                    symbol=symbol,
                    side=position_side,
                    size=remaining_quantity,
                    entry_price=price,
                    mark_price=price,
                    leverage=leverage,
                    margin=(remaining_quantity * price) / leverage,
                    liquidation_price=cls.calculate_liquidation_price(price, position_side, leverage),
                    status='OPEN'
                )
                action = 'created'
        
        # Update account balance
        account.balance += realized_pnl - commission
        account.save()
        
        return {
            'realized_pnl': realized_pnl,
            'action': action
        }
    
    @classmethod
    @transaction.atomic
    def check_and_execute_pending_limits(cls, symbol: str, current_price: Decimal) -> list:
        """Check and execute pending limit orders when price conditions are met"""
        
        executed_orders = []
        
        # Get all pending limit orders for the symbol
        pending_orders = Order.objects.filter(
            symbol=symbol,
            type='LIMIT',
            status='PENDING'
        )
        
        for order in pending_orders:
            if cls._should_execute_limit_order(order.side, order.price, current_price, is_pending=True):
                try:
                    # Execute the limit order
                    order.status = 'FILLED'
                    order.filled_quantity = order.quantity
                    order.average_fill_price = order.price
                    order.save()
                    
                    # Calculate commission
                    commission = order.quantity * order.price * cls.COMMISSION_RATE
                    
                    # Handle position update
                    position_result = cls._handle_position_update(
                        account=order.account,
                        symbol=order.symbol,
                        side=order.side,
                        quantity=order.quantity,
                        price=order.price,
                        leverage=order.leverage,
                        commission=commission
                    )
                    
                    # Create trade record
                    Trade.objects.create(
                        order=order,
                        account=order.account,
                        symbol=order.symbol,
                        side=order.side,
                        quantity=order.quantity,
                        price=order.price,
                        commission=commission,
                        fee_rate=cls.COMMISSION_RATE,
                        realized_pnl=position_result['realized_pnl'],
                        transaction_id=secrets.token_hex(4)
                    )
                    
                    executed_orders.append({
                        'order_id': str(order.id),
                        'symbol': order.symbol,
                        'side': order.side,
                        'quantity': float(order.quantity),
                        'price': float(order.price),
                        'realized_pnl': float(position_result['realized_pnl'])
                    })
                    
                    logger.info(f"Limit order executed: {order.symbol} {order.side} {order.quantity} @ {order.price}")
                    
                except Exception as e:
                    logger.error(f"Failed to execute limit order {order.id}: {str(e)}")
                    continue
        
        return executed_orders
    
    @classmethod
    def cancel_order(cls, order_id: str, account: TradingAccount) -> Dict:
        """Cancel a pending order"""
        try:
            order = Order.objects.get(id=order_id, account=account)
            
            if order.status != 'PENDING':
                return {
                    'success': False,
                    'error': f'Cannot cancel order with status: {order.status}'
                }
            
            order.status = 'CANCELLED'
            order.save()
            
            logger.info(f"Order cancelled: {order_id}")
            
            return {
                'success': True,
                'message': f'Order {order_id} cancelled successfully'
            }
        except Order.DoesNotExist:
            return {
                'success': False,
                'error': 'Order not found'
            }