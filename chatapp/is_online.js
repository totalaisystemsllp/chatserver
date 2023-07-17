var express = require('express');
var app = express();
var http = require('http').Server(app);
var socketIO = require("socket.io");
var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
var cors = require("cors");

const io = socketIO(http, {
  allowEIO3: true ,
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});


app.use(function (req, res, next) {
  let origin = req.get('origin') ?req.get('origin'): "*";
  let method = req.method;
  console.log(origin);
  console.log(method);
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", method);
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.removeHeader("x-powered-by");
  next();
});

const corsOpts = {
  origin: "*",

  methods: ["GET", "POST"],

  allowedHeaders: ["Content-Type"],
};

app.use(cors(corsOpts));

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json());

// app.use(express.static(path.join(__dirname, 'uploads')));
// app.use('/download', express.static('uploads'));


// var con = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "pass",
//   database: "gritserv_client"
// });

// con.connect(function(err) {
//   if (err) throw err;
//   console.log("Mysql Connected!");
// });


var sockets={};
var users={};
var offline_time={};



http.listen(8000, function(){
    console.log('listening on *:8000');

});

   
app.post('/get_user_list', (req, res) => {
res.json(Object.keys(users));

})

io.on('connection', (socket) => {
	socket.on('register_user',function(userId){       
        sockets[socket.id] = socket; 
        // sockets[socket] = userId;
        if(users.hasOwnProperty(userId))
        {
         users[userId].push(socket.id);
        }
        else
        {
          users[userId]=[];

          users[userId].push(socket.id);
        }
        socket.to(userId).emit('user_status', "online");
        console.log(users);
        console.log('user id '+userId+' connected with socket id '+socket.id);     
        // console.log(sockets); 
    });

  socket.on('search_user',function(id){       
        socket.join(id);
        if(users.hasOwnProperty(id))
        {
          io.to(id).emit('user_status', "online");
        }
        else
        {
          if(offline_time.hasOwnProperty(id))
          {
            let time_dif=Math.floor(Date.now() / 1000)- offline_time[id];
            io.to(id).emit('user_status', "offline",time_dif);
            // console.log(time_dif)
          }
          else
          {
            io.to(id).emit('user_status', "offline","unknown");
          }
          
        } 

    });

    /*
    * Funciton to search multiple user's status
    */
    socket.on('search_users',function(users_id_string){ 
      socket.join(users_id_string);
      //io.to(users_id_string).emit('users_status', users_id_string);    
      const user_ids = users_id_string.split(",");
      for(var i=0;i<user_ids.length;i++){
        if(users.hasOwnProperty(user_ids[i]))
        {
          io.to(users_id_string).emit('users_status', user_ids[i] , "online");
        }
        else
        {
          if(offline_time.hasOwnProperty(user_ids[i]))
          {
            let time_dif=Math.floor(Date.now() / 1000)- offline_time[user_ids[i]];
            io.to(users_id_string).emit('users_status',user_ids[i] , "offline",time_dif);
            // console.log(time_dif)
          }
          else
          {
            io.to(users_id_string).emit('users_status', user_ids[i] ,"offline","unknown");
          }
          
        }
      }//end of the for loop
  });//end of the function


  socket.on('disconnect', () => {

     let user_id = find_user_id(socket.id);
     delete sockets[socket.id];
     if(users[user_id] != undefined)
     {
      // console.log(users[user_id]);
     remove_element_from_array(users[user_id],socket.id);

     }
     
     if(users[user_id] != undefined)
     {
     if(users[user_id].length == 0)
     {
      delete users[user_id];
      socket.to(user_id).emit('user_status', "offline",0);
      offline_time[user_id]=Math.floor(Date.now() / 1000);
     }
     }
    console.log(users);
    console.log(user_id +" user id is disconnected with socket id "+socket.id);
    
    
  });


});

function remove_element_from_array(arr,element)
{
  for( var i = 0; i < arr.length; i++){ 
    
        if ( arr[i] == element) { 
    
            arr.splice(i, 1); 
        }
    
    }
}

function find_user_id(socket_id)
{

   for (const key in users) 
   {
     if(users[key].includes(socket_id))
     {
      return key;
     }
   }
}







