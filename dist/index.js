import cors from 'cors';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
});
const rooms = new Map();
app.get('/rooms/:id', (req, res) => {
    const roomId = req.params.id;
    const obj = rooms.has(roomId)
        ? {
            users: [...rooms.get(roomId).get('users').values()],
            messages: [...rooms.get(roomId).get('messages').values()]
        }
        : {
            users: [],
            messages: []
        };
    res.send(obj);
});
app.post('/rooms', (req, res) => {
    const { roomId } = req.body;
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Map([
            ['users', new Map()],
            ['messages', []]
        ]));
    }
    res.json(rooms.values());
});
io.on('connection', (socket) => {
    socket.on('room:connect', ({ roomId, nickName }) => {
        socket.join(roomId);
        rooms.get(roomId).get('users').set(socket.id, nickName);
        const users = [...rooms.get(roomId).get('users').values()];
        socket.to(roomId).emit('room:set_users', users);
    });
    socket.on('room:new_message', ({ roomId, nickName, text }) => {
        const message = {
            nickName,
            text
        };
        rooms.get(roomId).get('messages').push(message);
        socket.to(roomId).emit('room:add_message', message);
    });
    socket.on('disconnect', () => {
        rooms.forEach((value, roomId) => {
            if (value.get('users').delete(socket.id)) {
                const users = [...value.get('users').values()];
                socket.to(roomId).emit('room:set_users', users);
            }
        });
    });
});
server.listen(5000, () => {
    try {
        console.log(`⚡️[server]: Server is running at http://localhost:5000`);
    }
    catch (err) {
        if (err) {
            console.log(err);
        }
    }
});
