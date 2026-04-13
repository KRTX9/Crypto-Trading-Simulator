# Clean PnL Calculator for Trading System
from decimal import Decimal
from .models import Position, Trade, Order

class PnLCalculator:
    """Simple, clean PnL calculation for position closing"""
    
    @staticmethod
    def calculate_realized_pnl(position, exit_price, quantity_closed):
        """
        Calculate realized PnL when closing a position
        
        Args:
            position: Position object being closed
            exit_price: Price at which position is being closed
            quantity_closed: Amount of position being closed
            
        Returns:
            Decimal: Realized PnL amount
        """
        # Ensure we have valid decimal values
        entry_price = Decimal(str(position.entry_price))
        exit_price = Decimal(str(exit_price))
        quantity_closed = Decimal(str(quantity_closed))
        
        if position.side == 'LONG':
            # LONG: Profit when exit_price > entry_price
            pnl_per_unit = exit_price - entry_price
        else:
            # SHORT: Profit when exit_price < entry_price
            pnl_per_unit = entry_price - exit_price
            
        realized_pnl = pnl_per_unit * quantity_closed
        return realized_pnl
    
    @staticmethod
    def close_position_completely(position, exit_price):
        """Close entire position and return realized PnL"""
        realized_pnl = PnLCalculator.calculate_realized_pnl(
            position, exit_price, position.size
        )
        
        # Mark position as closed
        position.status = 'CLOSED'
        position.save()
        
        return realized_pnl
    
    @staticmethod
    def close_position_partially(position, exit_price, quantity_to_close):
        """Partially close position and return realized PnL"""
        realized_pnl = PnLCalculator.calculate_realized_pnl(
            position, exit_price, quantity_to_close
        )
        
        # Reduce position size
        position.size -= quantity_to_close
        position.margin = (position.size * position.entry_price) / position.leverage
        position.save()
        
        return realized_pnl