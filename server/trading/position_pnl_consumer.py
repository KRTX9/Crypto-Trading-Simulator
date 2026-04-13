"""
Position P&L Consumer
Consumes price updates from Redis Streams and updates position P&L in real-time
Replaces the periodic sync in priceSync.js
"""
import redis
import time
import json
import os
import sys
import django
from decimal import Decimal
from pathlib import Path

# Add parent directory to path so we can import Django modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
sys.path.insert(0, parent_dir)

# Load environment variables from .env file
from decouple import config

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from trading.models import Position, TradingAccount

class PositionPnLConsumer:
    """
    Consume price updates and update position P&L in real-time
    Replaces the periodic sync in priceSync.js
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_name = "futures:prices:stream"
        self.consumer_group = "position_pnl_updater"
        self.consumer_name = "pnl_worker_1"

        # Create consumer group
        try:
            self.redis.xgroup_create(
                self.stream_name,
                self.consumer_group,
                id='0',
                mkstream=True
            )
            print(f"Created consumer group: {self.consumer_group}")
        except redis.ResponseError as e:
            if "BUSYGROUP" in str(e):
                print(f"Consumer group already exists: {self.consumer_group}")
            else:
                raise

    def start_consuming(self):
        """
        Consume price updates and update positions
        """
        print(f"Starting Position P&L consumer...")

        while True:
            try:
                # Read from stream
                messages = self.redis.xreadgroup(
                    self.consumer_group,
                    self.consumer_name,
                    {self.stream_name: '>'},
                    count=100,
                    block=1000
                )

                for stream, message_list in messages:
                    for message_id, data in message_list:
                        try:
                            self._update_positions(data)

                            # Acknowledge
                            self.redis.xack(
                                self.stream_name,
                                self.consumer_group,
                                message_id
                            )
                        except Exception as e:
                            print(f"Error updating positions: {e}")

            except Exception as e:
                print(f"Consumer error: {e}, retrying in 5 seconds...")
                time.sleep(5)

    def _update_positions(self, price_data: dict):
        """
        Update all positions for this symbol
        """
        symbol = price_data['symbol']
        current_price = Decimal(price_data['price'])

        # Get all open positions for this symbol from database
        positions = Position.objects.filter(
            symbol=symbol,
            status='OPEN'
        ).select_related('account')

        for position in positions:
            try:
                # Update mark_price only (unrealized_pnl is calculated automatically via @property)
                position.mark_price = current_price
                position.save(update_fields=['mark_price'])

                # Get calculated unrealized_pnl from the property
                unrealized_pnl = position.unrealized_pnl

                # Cache position data in Redis for fast access
                position_key = f"futures:position:{position.id}"
                self.redis.hset(position_key, mapping={
                    'id': str(position.id),
                    'user_id': str(position.account.user_id),
                    'symbol': symbol,
                    'side': position.side,
                    'size': str(position.size),
                    'entry_price': str(position.entry_price),
                    'mark_price': str(current_price),
                    'unrealized_pnl': str(unrealized_pnl),
                    'leverage': str(position.leverage)
                })
                self.redis.expire(position_key, 10)  # 10 second TTL

                # Add to symbol index for fast lookup
                self.redis.sadd(f"futures:positions:by_symbol:{symbol}", str(position.id))
                self.redis.expire(f"futures:positions:by_symbol:{symbol}", 10)

                # Publish update to user's WebSocket channel
                user_id = position.account.user_id
                update_message = json.dumps({
                    'type': 'position_update',
                    'position_id': str(position.id),
                    'symbol': symbol,
                    'unrealized_pnl': str(unrealized_pnl),
                    'mark_price': str(current_price)
                })
                
                self.redis.publish(
                    f"futures:position_updates:{user_id}",
                    update_message
                )

            except Exception as e:
                print(f"Error updating position {position.id}: {e}")

if __name__ == "__main__":
    # Get Redis connection from environment or use defaults
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    
    print(f"Attempting to connect to Redis at {redis_host}:{redis_port}")
    
    redis_client = redis.Redis(
        host=redis_host, 
        port=redis_port, 
        decode_responses=True
    )
    
    # Test Redis connection
    try:
        redis_client.ping()
        print(f"Connected to Redis at {redis_host}:{redis_port}")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")
        exit(1)
    
    # Test database connection
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        print(f"Database connection: OK")
    except Exception as e:
        print(f"Database connection failed: {e}")
        print(f"Make sure MySQL is running and credentials in .env are correct")
        print(f"DB_HOST={os.getenv('DB_HOST', 'localhost')}")
        print(f"DB_PORT={os.getenv('DB_PORT', '3306')}")
        print(f"DB_NAME={os.getenv('DB_NAME', 'dbname')}")
        exit(1)
    
    consumer = PositionPnLConsumer(redis_client)
    consumer.start_consuming()
