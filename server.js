const express = require("express");
const http = require("http");
const socketio = require("socket.io");
const ACTIONS = require("./src/Actions");
const cors = require("cors");
const path = require('path');

const app = express();
app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


const PORT = process.env.PORT || 5000;

const server = http.createServer(app);
const io = socketio(server);

const userSocketMap = {};

const getAllConnectedClients = (roomId) => {
    // io.sockets.adapter.rooms.get returns us a map
    // so to convert it in Array we are using Array.from
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId) => {
        return {
            socketId,
            username: userSocketMap[socketId],
        };
    });
}

io.on('connection', (socket) => {
    console.log('socket connected!', socket.id);

    socket.on(ACTIONS.JOIN, ({roomId, username}) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const allClients = getAllConnectedClients(roomId);
        console.log("Clients: ", allClients);
        allClients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                allClients,
                username,
                socketId: socket.id,
            })
        })
    });

    socket.on(ACTIONS.CODE_CHANGE, ({roomId, code}) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {code})
    })

    socket.on(ACTIONS.SYNC_CODE, ({socketId, code}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {code})
    })

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId:socket.id,
                username:userSocketMap[socket.id],
            })
        })
        delete userSocketMap[socket.id];
        socket.leave();
    })
})

app.get("/", (req, res) => {
    res.send("Hello, i am testing")
})

server.listen(PORT, ()=> {
    console.log(`listening on port ${PORT}`);
})
