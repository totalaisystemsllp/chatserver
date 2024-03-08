const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const socketIO = require("socket.io");

const app = express();
const server = http.createServer(app);

const config = require("./config");
const allowedOrigins = config.allowedOrigins;

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

let sockets = {};
let user_details = {};
let rooms = {};
let all_collector = [];

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));

app.get("/", (req, res) => {
  console.log("Server is up");
  res.sendStatus(200);
});

app.post("/", (req, res) => {
  console.log("Data from POST:", req.body);

  const data = req.body;

  if (data.is_accept == 0) {
    io.to("collector").emit("mgs_req_from_debtor", data);
    console.log("Message request to all collectors");
  } else if (data.is_accept == 1) {
    io.to(data.thread_id).emit("mgs_from_debtor", data);
    console.log("Message to " + data.thread_id + " thread ID");
  }

  res.sendStatus(200);
});

/*************socket Connection*****************/
const io = socketIO(server, {
  allowEIO3: true,
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on(
    "register_user_id",
    (userId, old_thread_list = [], role, name, email = null) => {
      const socketId = "COL_" + userId;
      sockets[socketId] = socket;
      all_collector.push(socketId);
      all_collector = all_collector.filter((x, i, a) => a.indexOf(x) === i);
      user_details[socketId] = {
        userId: userId,
        role: role,
        name: name,
        email: email,
      };
      sockets[socketId].join("collector");

      console.log(socketId + " user connected");
      console.log(user_details);
      console.log(all_collector);

      for (let i = 0; i < old_thread_list.length; i++) {
        sockets[socketId].join(old_thread_list[i]);
        console.log(
          "Old room ID " +
            old_thread_list[i] +
            " created and " +
            socketId +
            " user joined"
        );
      }
    }
  );

  socket.on("req_accept", (thread_id, coll_id) => {
    const socketId = "COL_" + coll_id;
    sockets[socketId].join(thread_id);
    rooms[thread_id] = { coll_id: socketId };
    socket.to("collector").emit("remove_req_accept", thread_id);
    console.log(
      "New room ID " + thread_id + " created and " + socketId + " user joined"
    );
  });

  socket.on("close", (thread_id) => {
    delete rooms[thread_id];
    console.log("Room ID " + thread_id + " closed");
  });

  socket.on(
    "transfer_chat",
    (thread_id, from_collector_id, to_collector_id) => {
      const fromSocketId = "COL_" + from_collector_id;
      const toSocketId = "COL_" + to_collector_id;

      socket.leave(thread_id);

      if (sockets.hasOwnProperty(toSocketId)) {
        sockets[toSocketId].join(thread_id);
        io.to(thread_id).emit("transfered_chat", { thread_id: thread_id });

        console.log(
          "Transfer chat from user ID " +
            fromSocketId +
            " to " +
            toSocketId +
            " and thread ID " +
            thread_id
        );
      }
    }
  );

  socket.on("disconnect", () => {
    const socketId = Object.keys(sockets).find(
      (key) => sockets[key] === socket
    );
    if (socketId) {
      console.log(socketId + " user ID is disconnected");
      const index = all_collector.indexOf(socketId);
      if (index > -1) {
        all_collector.splice(index, 1);
      }

      delete user_details[socketId];
      delete sockets[socketId];
      console.log(user_details);
      console.log(all_collector);
    }
  });
});

const port = process.env.PORT || 7000;
server.listen(port, () => {
  console.log("Listening on port " + port);
});
