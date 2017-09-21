/*
Copyright 2017 Amazon.com, Inc. or its affiliates. All Rights Reserved.

Licensed under the Amazon Software License (the "License"). You may not use this file except in compliance with the License. A copy of the License is located at

    http://aws.amazon.com/asl/

or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions and limitations under the License.
*/
var faker = require('faker');
var moment = require('moment');
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

var Redis = require('ioredis');
var redis_address = process.env.REDIS_ADDRESS || 'redis://127.0.0.1:6379';

var redis = new Redis(redis_address);
var redis_subscribers = {};
var channel_history_max = 10;

app.use(express.static('public'));
app.get('/health', function(request, response) {
    response.send('ok');
});

app.get('/rooms', function(request, response) {
    const json = [
        {"id" : 1, "name": "ultimate frisbee finals!"},
        {"id" : 2, "name": "racing finals!"},
        {"id" : 3, "name": "soccer finals!"}
    ];
    response.send(json);
});

function add_redis_subscriber(subscriber_key) {
    var client = new Redis(redis_address);

    client.subscribe(subscriber_key);
    client.on('message', function(channel, message) {
        io.emit(subscriber_key, JSON.parse(message));
    });

    redis_subscribers[subscriber_key] = client;
}
add_redis_subscriber('messages');
add_redis_subscriber('member_add');
add_redis_subscriber('member_delete');
io.on('connection', function(socket) {
    socket.on('LeaveRoom', function(data) {
        socket.leave(data.room);
        socket.removeAllListeners('send');
        console.log("left room : " + data.room);
    });
    socket.on('EnterRoom', function(data) {
        socket.join(data.room);
        console.log("User joined: " + data.room);
        let roomId = data.id;
        var get_members = redis.hgetall(`members-${roomId}`).then(function(redis_members) {
            var members = {};
            for (var key in redis_members) {
                members[key] = JSON.parse(redis_members[key]);
            }
            return members;
        });

        var initialize_member = get_members.then(function(members) {
            if (members[socket.id]) {
                return members[socket.id];
            }

            var username = faker.fake("{{name.firstName}} {{name.lastName}}");
            var member = {
                socket: socket.id,
                username: username,
                avatar: "//api.adorable.io/avatars/30/" + username + '.png'
            };

            return redis.hset(`members-${roomId}`, socket.id, JSON.stringify(member)).then(function() {
                return member;
            });
        });

        // get the highest ranking messages (most recent) up to channel_history_max size
        var get_messages = redis.zrange('messages', -1 * channel_history_max, -1).then(function(result) {
            let newResult =  result.map(function(x) {
                return JSON.parse(x);
            }).filter(a => a.roomId == roomId);
            return newResult;
        });

        Promise.all([get_members, initialize_member, get_messages]).then(function(values) {
            var members = values[0];
            var member = values[1];
            var messages = values[2];

            io.in(`defaultRoom-${roomId}`).emit('member_history', members);
            io.in(`defaultRoom-${roomId}`).emit('message_history', messages);
            member.roomId = roomId; // lol
            redis.publish('member_add', JSON.stringify(member));

            socket.on('send', function(message_text) {
                var date = moment.now();
                var message = JSON.stringify({
                    date: date,
                    username: member['username'],
                    avatar: member['avatar'],
                    roomId: roomId,
                    message: message_text
                });
                console.log(`sending message to ${roomId}`)
                console.log(socket.rooms)
                redis.zadd(`messages`, date, message); //-${roomId}
                redis.publish(`messages`, message)
            });

            socket.on('disconnect', function() {
                redis.hdel(`members`, socket.id);
                console.log("del me");
                socket.roomId = roomId;
                redis.publish(`member_delete`, JSON.stringify(socket.id));
            });
        }).catch(function(reason) {
            console.log('ERROR: ' + reason);
        });
    });
});

http.listen(port, function() {
    console.log('Started server on port ' + port);
});
