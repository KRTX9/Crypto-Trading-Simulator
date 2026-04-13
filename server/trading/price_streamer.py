"""
Binance Price Streamer to Redis Streams
Replaces frontend priceSync.js with backend streaming service
"""
import asyncio
import websockets
import json
import redis
import os
from decimal import Decimal

class BinancePriceStreamer:
    """
    Stream prices from Binance directly to Redis Streams
    Replaces frontend priceSync.js
    """

    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        self.stream_name = "futures:prices:stream"
        self.symbols = [
            'btcusdt', 'ethusdt', 'adausdt', 'bnbusdt',
            'dotusdt', 'xrpusdt', 'solusdt', 'suiusdt',
            'dogeusdt', 'linkusdt', 'xlmusdt', 'ltcusdt'
        ]

    async def start_streaming(self):
        """
        Connect to Binance WebSocket and stream to Redis
        """
        # Build WebSocket URL for multiple symbols
        streams = '/'.join([f"{s}@ticker" for s in self.symbols])
        ws_url = f"wss://stream.binance.com:9443/stream?streams={streams}"

        print(f"Connecting to Binance WebSocket...")

        while True:  # Auto-reconnect loop
            try:
                async with websockets.connect(ws_url) as ws:
                    print(f"Connected! Streaming {len(self.symbols)} symbols to Redis...")

                    while True:
                        try:
                            message = await ws.recv()
                            data = json.loads(message)

                            if 'data' in data:
                                ticker = data['data']
                                await self._publish_to_stream(ticker)

                        except websockets.exceptions.ConnectionClosed:
                            print("WebSocket connection closed, reconnecting...")
                            break
                        except Exception as e:
                            print(f"Error processing message: {e}")
                            await asyncio.sleep(1)

            except Exception as e:
                print(f"Connection error: {e}, retrying in 5 seconds...")
                await asyncio.sleep(5)

    async def _publish_to_stream(self, ticker: dict):
        """
        Publish ticker to Redis Stream
        """
        symbol = ticker['s']  # e.g., "BTCUSDT"

        # Publish to Redis Stream (NOT database)
        try:
            message_id = self.redis.xadd(
                self.stream_name,
                {
                    'symbol': symbol,
                    'price': ticker['c'],  # Close price
                    'high': ticker['h'],
                    'low': ticker['l'],
                    'volume': ticker['v'],
                    'price_change_percent': ticker['P'],
                    'timestamp': str(ticker['E'] / 1000)  # Event time
                },
                maxlen=10000,  # Keep last 10k prices
                approximate=True
            )

            # Also cache latest price for quick lookup
            self.redis.setex(
                f"futures:price:latest:{symbol}",
                2,  # 2 second TTL
                ticker['c']
            )
        except Exception as e:
            print(f"Error publishing to Redis: {e}")

# Run as background service
if __name__ == "__main__":
    # Get Redis connection from environment or use defaults
    redis_host = os.getenv('REDIS_HOST', 'localhost')
    redis_port = int(os.getenv('REDIS_PORT', 6379))
    
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
    
    streamer = BinancePriceStreamer(redis_client)
    asyncio.run(streamer.start_streaming())
