const app = require('express')();

const server = require('http').createServer(app);

const io = require('socket.io')(server,{cors:{origin:'*'}});
const rooms = {};
const players = {};
const rule = {"rock": "paper",
    "paper": "scissor",
    "scissor":"rock"
}
const options = {};
const pts = {};
const usernames = {};

io.on("connection", socket => {
    // console.log(socket.id);
    socket.on("create-room", ({ roomid, username }) => {
        console.log(roomid, username);
        if (rooms[roomid]) {
            socket.emit("error","already exist");
        }
        else {
            rooms[roomid] = true;
            players[roomid] = [];
            usernames[roomid] = [];
            usernames[roomid][0] = username;
            players[roomid][0] = socket.id;
            pts[roomid] = [0, 0];
            console.log("room created");
            socket.join(roomid);
            socket.emit("room-created",roomid);
        }
    })
    socket.on("join-room", ({roomid,username}) => {
        if (rooms[roomid]&&!players[roomid][1]) {
            players[roomid][1] = socket.id;
            usernames[roomid][1] = username;
            socket.join(roomid);
            socket.emit("room-joined", roomid);
            io.to(roomid).emit("2p-joined",[pts[roomid],usernames[roomid]]);
        }
        else {
            socket.emit("error","room is full");
        }
    })
    socket.on("option-selected", ({choosed,roomid}) => {
        console.log(choosed);
        if (options[roomid]) {
            if (players[roomid][0] == socket.id) {
                if (options[roomid][1] == choosed) {
                    io.to(roomid).emit("draw");
                }
                else if (rule[options[roomid][1]] == choosed) {
                    pts[roomid][0]++;
                    io.to(roomid).emit("1p-won",pts[roomid]);
                }
                else {
                    pts[roomid][1]++;
                    io.to(roomid).emit("2p-won",pts[roomid]);
                }
            }
            else {
                if (options[roomid][0] == choosed) {
                    io.to(roomid).emit("draw");
                }
                else if (rule[options[roomid][0]] == choosed) {
                    pts[roomid][1]++;
                    io.to(roomid).emit("2p-won",pts[roomid]);
                }
                else {
                    pts[roomid][0]++;
                    io.to(roomid).emit("1p-won",pts[roomid]);
                }
            }
            delete options[roomid];
        }
        else {
            if (players[roomid][0] == socket.id) {
                options[roomid] = [];
                options[roomid][0] = choosed;
            }
            else {
                options[roomid] = ["",];
                options[roomid][1] = choosed;
            }
        }
    })
    socket.on("send-message", ({ msg, roomid }) => {
        socket.to(roomid).emit("recieve-msg", msg);
        
    })
    socket.on("disconnect", () => {
        console.log("disconnected user");
        Object.keys(players).forEach((key) => {
            if (players[key][0] == socket.id) {
                console.log(key);
                io.to(key).emit("room-over");
                delete rooms[key];
                delete players[key];
                delete pts[key];
                delete options[key];
                
            }
            else if (players[key][1] == socket.id) {
                console.log(key);
                delete players[key][1];
              
                io.to(key).emit("2p-left");
            }
       })
    })
})

server.listen((process.env.PORT||3000), () => {
    console.log("server is listening");
})