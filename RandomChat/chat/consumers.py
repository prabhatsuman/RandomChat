import json
from channels.generic.websocket import AsyncWebsocketConsumer
import redis

redis_client = redis.StrictRedis(host='redis', port=6379, db=0)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = None
        self.matched_user = None
        self.matched_user_channel = None       
        await self.accept()

    async def disconnect(self, close_code):
        if self.user:
            redis_client.srem('active_users', self.user)
            redis_client.delete(f'searching:{self.user}')
            if self.matched_user_channel:
                await self.channel_layer.group_send(
                    self.matched_user_channel,
                    {
                        'type': 'disconnect_message',
                        'message': f'{self.user} has disconnected.'
                    }
                )
                await self.channel_layer.group_discard(
                    self.matched_user_channel,
                    self.channel_name
                )

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data['type'] == 'register':
            await self.register_user(data['username'])
        elif data['type'] == 'search':
            await self.search_user()
        elif data['type'] == 'message':
            await self.send_message(data['message'])
        elif data['type'] == 'skip':            
            await self.skip_chat()

    async def register_user(self, username):
        if redis_client.sismember('active_users', username):
            await self.send(text_data=json.dumps({
                'error': 'Username already exists'
            }))
            return
        self.user = username
        redis_client.sadd('active_users', username)
        await self.send(text_data=json.dumps({
            'message': 'User registered successfully',
            'username': username
        }))

    async def search_user(self):       
        redis_client.set(f'searching:{self.user}', self.channel_name)
        searching_users = redis_client.keys('searching:*')
        if len(searching_users) > 1:
            for user_key in searching_users:
                user = user_key.decode('utf-8').split(':')[1]
                if user != self.user:
                    print(f"{self.user} matched with {user} ")
                    matched_user_channel = redis_client.get(
                        user_key).decode('utf-8')

                    # Check if the other user is still searching
                    if redis_client.exists(f'searching:{user}'):
                        self.matched_user_channel = f'chat_{self.user}_{user}'
                        self.matched_user = user

                        # Delete the searching keys
                        redis_client.delete(f'searching:{self.user}')
                        redis_client.delete(user_key)

                        # Notify both users and add them to the group
                        await self.channel_layer.group_add(
                            self.matched_user_channel,
                            self.channel_name
                        )
                        await self.channel_layer.group_add(
                            self.matched_user_channel,
                            matched_user_channel
                        )

                        await self.send(text_data=json.dumps({
                            'type': 'match',
                            'matched_user': user
                        }))
                        await self.channel_layer.send(
                            matched_user_channel,
                            {
                                'type': 'match',
                                'matched_user': self.user
                            }
                        )
                        break
        else:
            await self.send(text_data=json.dumps({
                'message': 'Searching for a chat partner...'
            }))
           
    async def send_message(self, message):
        if self.matched_user_channel:
            await self.channel_layer.group_send(
                self.matched_user_channel,
                {
                    'type': 'chat_message',
                    'message': message,
                    'username': self.user
                }
            )

    async def skip_chat(self):
        if self.matched_user_channel:
            await self.channel_layer.group_send(
                self.matched_user_channel,
                {
                    'type': 'disconnect_message',
                    'message': f'{self.user} has skipped the chat.'
                }
            )
            await self.channel_layer.group_discard(
                self.matched_user_channel,
                self.channel_name
            )
            await self.channel_layer.send(
                self.matched_user_channel,
                {
                    'type': 'skip',
                    'message': f'{self.user} has skipped the chat.'
                }
            )

            self.matched_user_channel = None
            self.matched_user = None

    async def chat_message(self, event):
        message = event['message']
        username = event['username']
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': message,
            'username': username
        }))

    async def disconnect_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'disconnect',
            'message': message
        }))

    async def match(self, event):
        matched_user = event['matched_user']
        self.matched_user_channel = f'chat_{matched_user}_{self.user}'
        self.matched_user = matched_user
        await self.channel_layer.group_add(
            self.matched_user_channel,
            self.channel_name
        )
        await self.send(text_data=json.dumps({
            'type': 'match',
            'matched_user': matched_user
        }))
