var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http,{
  allowEIO3: true, // false by default,
  cors: {
    origin: ["https://totalcollectr.dev"],
    credentials: true
  }
});
var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');

var sockets={};
var user_details={};
var rooms={};
var all_collector=[];
var all_debtor=[];

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json());





app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods','GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
})

// app.get('/check_user_in_match/:user_id',  function(req, res){

//    res.send(check_user_in_match(req.params.user_id));

// });

app.post('/', (req, res) => {
    console.log('data from post:', req.body);
    var data=req.body;

    if(data.is_accept == 0)
    {
       io.to("collector").emit('mgs_req_from_debtor', data);
       console.log('message request to all collector');

    }
    else if(data.is_accept == 1)
    {
       io.to(data.thread_id).emit('mgs_from_debtor', data);
       console.log('message to '+data.thread_id+' thread id');

    }
    

    res.sendStatus(200);
});

io.on('connection', (socket) => {

  socket.on('register_user_id',function(userId,old_thread_list=[],role,name,email=null){

     sockets["COL_"+userId] = socket; 
     all_collector.push("COL_"+userId);
     // array unique
     all_collector = all_collector.filter((x, i, a) => a.indexOf(x) == i);
     user_details["COL_"+userId]={"userId":userId,"role":role,"name":name,"email":email};
     sockets["COL_"+userId].join("collector");

     console.log("COL_"+userId+' user connected');
     console.log(user_details);
     console.log(all_collector);

     for (var i = 0; i < old_thread_list.length; i++) {
         sockets["COL_"+userId].join(old_thread_list[i]);
     console.log("old room id "+old_thread_list[i]+" created and COL_"+userId+' user joined');

         
     }

     
     

  });


  socket.on('req_accept',function(thread_id,coll_id){  
    
    sockets["COL_"+coll_id].join(thread_id);
    rooms[thread_id]={"coll_id":"COL_"+coll_id};
    socket.to("collector").emit('remove_req_accept', thread_id);
     console.log("new room id "+thread_id+" created and COL_"+coll_id+' user joined');
     // console.log(rooms);


  });

  socket.on('close',function(thread_id){ 
    delete rooms[thread_id]; 
    console.log("room id "+thread_id+" closed");

  });

  socket.on('transfer_chat', (thread_id,from_collector_id,to_collector_id) => 
  {
    socket.leave(thread_id);

    if(sockets.hasOwnProperty("COL_"+to_collector_id))
    {
    sockets["COL_"+to_collector_id].join(thread_id); 
    io.to(thread_id).emit('transfered_chat', {"thread_id":thread_id});

    console.log("transfer chat from user id COL_"+from_collector_id+" to COL_"+to_collector_id+" and thread id "+thread_id)
    
    // rooms[thread_id][coll_id]="COL_"+to_collector_id;
    // console.log(rooms[thread_id]); 

    }

    


    
  });


  socket.on('disconnect', () => {

    let key = Object.keys(sockets)[Object.values(sockets).indexOf(socket)];
    console.log(key +" user id is disconnected");
    const index = all_collector.indexOf(key);
    if (index > -1) {
      all_collector.splice(index, 1);
    }

    delete user_details[key]; 
    delete sockets[key]; 
    console.log(user_details);  
    console.log(all_collector);
    // console.log(sockets);


    
  });

});


http.listen(7000, function(){
    console.log('listening on *:7000');

});
