import json
from channels.generic.websocket import AsyncWebsocketConsumer
import redis
import asyncio
import os
from asyncio import Lock

# Redis client setup
host=os.getenv('REDIS_HOST')
redis_client = redis.StrictRedis(host=host, port=6379, db=0)

# Lock for synchronized queue operations
queue_lock = Lock()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.interest = None
        self.matched_user = None
        self.matched_user_channel = None
        await self.accept()

    async def disconnect(self, close_code):
        await self.cleanup_user()
        if self.matched_user:
            await self.notify_match_disconnected()

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        if message_type == 'register':
            await self.register_user(data['username'], data['interest'])
        elif message_type == 'find_new_user':
            await self.find_new_user()
        elif message_type == 'skip':
            await self.skip_chat()
        elif message_type == 'change_interest':
            await self.change_interest(data['new_interest'])
        elif message_type == 'message':
            await self.forward_message(data['message'])
        elif message_type == 'logout':
            await self.handle_logout()

    # Utility Methods

    async def handle_logout(self):
        """Handles the logout process for the user."""
        if not self.user:
            await self.notify_user('error', {'message': 'User not registered.'})
            return
        if self.matched_user:
            await self.notify_match_disconnected()
        await self.cleanup_user()
        await self.notify_user('logout', {'message': 'User logged out successfully.'})

    async def cleanup_user(self):
        """Removes the user from queues and cleans up the state."""
        if self.user and self.interest:
            async with queue_lock:
                redis_client.lrem(f'queue:{self.interest}', 0, self.user)
        if self.matched_user_channel:
            await self.channel_layer.group_discard(
                self.matched_user_channel,
                self.channel_name
            )
        if self.user:
            redis_client.delete(f'channel:{self.user}')
            redis_client.delete(f'user_interest:{self.user}')
            redis_client.srem('active_users', self.user)
        self.user = None
        self.interest = None
        self.matched_user = None
        self.matched_user_channel = None

    async def notify_match_disconnected(self):
        """Notify the matched user about disconnection."""
        matched_user_channel = redis_client.get(f'channel:{self.matched_user}')
        if matched_user_channel:
            await self.channel_layer.send(
                matched_user_channel.decode('utf-8'),
                {
                    'type': 'start_search_trigger',
                    'message': f'{self.user} has disconnected.',
                }
            )

    async def notify_user(self, message_type, message_data):
        """Sends a message to the current WebSocket connection."""
        await self.send(text_data=json.dumps({
            'type': message_type,
            **message_data
        }))

    async def manage_queue(self, action, username=None, interest=None):
        """Handles adding or removing users from interest queues."""
        queue_key = f'queue:{interest or self.interest}'
        async with queue_lock:
            if action == 'add':
                redis_client.rpush(queue_key, username or self.user)
            elif action == 'remove':
                redis_client.lrem(queue_key, 0, username or self.user)

    # Core Features
    async def register_user(self, username, interest):
        if redis_client.sismember('active_users', username):
            await self.notify_user('error', {'message': 'Username already exists'})
            return

        self.user = username
        self.interest = interest
        redis_client.sadd('active_users', username)
        await self.notify_user('success', {'message': 'User registered successfully','interest': interest,'username': username})
        redis_client.set(f'user_interest:{self.user}', self.interest)
        await asyncio.sleep(0.01)
        await self.start_search()

    async def skip_chat(self):
        """Handle skip chat logic without starting search automatically."""
        if self.matched_user:
            matched_user_interest = redis_client.get(
                f'user_interest:{self.matched_user}').decode('utf-8')
            await self.notify_match_disconnected()
        self.matched_user = None
        self.matched_user_channel = None
        await self.notify_user('skip', {
            'message': 'You have skipped the chat.',
            'next_action': 'You can choose to change your interest or find a new user.'
        })

    async def find_new_user(self):
        """Manually initiate a new search for a user."""
        await self.start_search()

    async def change_interest(self, new_interest):
        """Changes the interest of the user and updates their state."""
        if not self.user:
            await self.notify_user('error', {'message': 'User not registered.'})
            return

        old_interest = self.interest
        self.interest = new_interest

        queue_key = f'queue:{old_interest}'
        async with queue_lock:
            queue = redis_client.lrange(queue_key, 0, -1)
            if (len(queue) > 0 and queue[-1].decode('utf-8') == self.user):
                redis_client.lrem(queue_key, 0, self.user)

        await self.notify_user('interest_changed', {'message': 'Interest changed successfully.'})

    async def start_search(self):
        """Search for a new user to chat with."""

        await self.manage_queue('add', self.user, self.interest)
        if not self.interest or not self.user:
            await self.notify_user('error', {'message': 'User not registered or no interest provided.'})
            return

        queue_key = f'queue:{self.interest}'
        matched_user = None

        async with queue_lock:
            queue = redis_client.lrange(queue_key, 0, -1)
            if len(queue) > 1 and queue[-1].decode('utf-8') == self.user:
                matched_user = queue[-2].decode('utf-8')
                redis_client.lrem(queue_key, 0, self.user)
                redis_client.lrem(queue_key, 0, matched_user)

        if matched_user:
            await self.setup_match(matched_user)
        else:
            await self.notify_user('search', {'message': 'No match found. Searching...'})
            redis_client.set(f'channel:{self.user}', self.channel_name)

    async def setup_match(self, matched_user):
        """Sets up a match between two users."""
        self.matched_user = matched_user
        self.matched_user_channel = f'chat_{self.user}_{matched_user}'

        await self.channel_layer.group_add(self.matched_user_channel, self.channel_name)
        await self.notify_user('match', {'matched_user': matched_user})

        matched_user_channel = redis_client.get(f'channel:{matched_user}')
        if matched_user_channel:
            await self.channel_layer.group_add(self.matched_user_channel, matched_user_channel.decode('utf-8'))
            await self.channel_layer.send(
                matched_user_channel.decode('utf-8'),
                {
                    'type': 'match',
                    'matched_user': self.user,
                }
            )

    async def forward_message(self, message):
        if not self.matched_user_channel:
            await self.notify_user('error', {'message': 'No active chat session to send messages.'})
            return

        await self.channel_layer.group_send(
            self.matched_user_channel,
            {
                'type': 'chat_message',
                'message': message,
                'username': self.user,
            }
        )

    # Event Handlers
    async def chat_message(self, event):
        await self.notify_user('message', {
            'message': event['message'],
            'username': event['username']
        })

    async def match(self, event):
        matched_user = event['matched_user']
        self.matched_user_channel = f'chat_{matched_user}_{self.user}'
        self.matched_user = matched_user
        await self.channel_layer.group_add(self.matched_user_channel, self.channel_name)
        await self.notify_user('match', {'matched_user': matched_user})

    async def start_search_trigger(self, event):
        await self.notify_user('disconnect', {'message': event['message']})
