const express = require("express");
const http = require("http");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const socketIO = require("socket.io");
const fs = require('fs');
const path = require('path');

/****Get DB Configuration****/
const database_config = require("./database_config");

/****Get Configuration****/
const config = require("./config");

const app = express();
const server = http.createServer(app);

const allowedOrigins = config.allowedOrigins;

const io = socketIO(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

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

app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
app.use(bodyParser.json());

// app.use(express.static(path.join(__dirname, 'uploads')));
app.use("/download", express.static("uploads"));

/*
var con = mysql.createConnection({
  host: "185.214.126.8",
  user: "u450063211_tpai",
  password: "A8fDk@AR/^h",
  database: "u450063211_tpai"
});*/


// Error logging middleware to catch and log errors
const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), { flags: 'a' });








var sockets = {};
var user_details = {};

io.on("connection", (socket) => {

   socket.on("test",function(){
     socket.emit("test_response",1,2);
      accessLogStream.write(JSON.stringify("Connect") + '\n');
   });

   // Handle socket errors
   socket.on('error', (error) => {
    const logData = {
      timestamp: new Date().toISOString(),
      message: 'Socket Error',
      error: error.message || 'Socket Error occurred',
      stack: error.stack || '',
    };
    accessLogStream.write(JSON.stringify(logData) + '\n');
  });

  socket.on("disconnect", () => {
    console.log(" user id is disconnected");
  });  
});

const accessLogPath = path.join(__dirname, 'access.log');

app.get('/access-log', (req, res) => {
  try {
    const logData = fs.readFileSync(accessLogPath, 'utf8');
    res.send(`<pre>${logData}</pre>`);
  } catch (err) {
    console.error('Error reading the log file:', err);
    res.status(500).send('Error reading the log file');
  }
});

// Start the server
const port = 4000;
server.listen(port, () => {
  console.log(`Server started on ${port}`);
});
