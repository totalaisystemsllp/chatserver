const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const socketIO = require("socket.io");

/****Get Configuration****/
const config = require("./config");

const app = express();
const server = http.createServer(app);

const allowedOrigins = config.allowedOrigins;

/***** Socket Connection *****/
const io = socketIO(server, {
  allowEIO3: true,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/***** Handling Cors Connection *****/
app.use(
  cors({
    origin: (origin, callback) => {
      if (allowedOrigins.includes(origin) || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  })
);

var sockets = {};
var user_details = {};
var rooms = {};
var all_collector = [];
var dbName = "";
var roomName = "";

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

app.post("/", (req, res) => {
  console.log("data from post:", req.body);

  var data = req.body;

  if (data.is_accept == 0) {
    io.to("collector").emit("mgs_req_from_debtor", data);
    console.log("message request to all collector");
  } else if (data.is_accept == 1) {
    io.to(data.thread_id).emit("mgs_from_debtor", data);
    console.log("message to " + data.thread_id + " thread id");
  }

  res.sendStatus(200);
});

/**************Socket Connection**********************/

io.on("connection", (socket) => {
  dbName = socket.handshake.query.db ?? "";
  roomName = `ROOM_${dbName}`;
  socket.on(
    "register_user_id",
    function (userId, old_thread_list = [], role, name, email = null) {
      let scoketId = `${dbName}_${userId}`;
      sockets[scoketId] = socket;
      all_collector.push(scoketId);
      // array unique
      all_collector = all_collector.filter((x, i, a) => a.indexOf(x) == i);
      user_details[scoketId] = {
        userId: userId,
        role: role,
        name: name,
        email: email,
      };
      sockets[scoketId].join(roomName);

      for (var i = 0; i < old_thread_list.length; i++) {
        sockets[scoketId].join(old_thread_list[i]);
      }
    }
  );

  socket.on("req_accept", function (thread_id, coll_id) {
    let scoketId = `${dbName}_${coll_id}`;

    sockets[scoketId].join(thread_id);
    rooms[thread_id] = { coll_id: scoketId };

    socket.to(roomName).emit("remove_req_accept", thread_id);
  });

  socket.on("close", function (thread_id) {
    delete rooms[thread_id];
  });

  socket.on(
    "transfer_chat",
    (thread_id, from_collector_id, to_collector_id) => {
      socket.leave(thread_id);

      let scoketId = `${dbName}_${coll_id}`;

      if (sockets.hasOwnProperty(scoketId)) {
        sockets[scoketId].join(thread_id);
        io.to(thread_id).emit("transfered_chat", { thread_id: thread_id });
      }
    }
  );

  socket.on("disconnect", () => {
    let key = Object.keys(sockets)[Object.values(sockets).indexOf(socket)];

    const index = all_collector.indexOf(key);
    if (index > -1) {
      all_collector.splice(index, 1);
    }

    delete user_details[key];
    delete sockets[key];
  });
});

server.listen(7000, function () {
  console.log("listening on *:7000");
});
