var express = require('express');
var app = express();
var http = require('http').Server(app);
var mysql = require('mysql');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');

var database_config = require('./database_config');
var io = require('socket.io')(http,{
  allowEIO3: true, // false by default,
  cors: {
    origin: ["https://totalcollectr.dev"],
    credentials: true
  }
});
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
app.use(bodyParser.json());

// app.use(express.static(path.join(__dirname, 'uploads')));
app.use('/download', express.static('uploads'));

/*
var con = mysql.createConnection({
  host: "185.214.126.8",
  user: "u450063211_tpai",
  password: "A8fDk@AR/^h",
  database: "u450063211_tpai"
});*/





var sockets={};
var user_details={};
var rooms={};
var all_collector=[];
var all_debtor=[];


var client='';
app.use(function(req, res, next) {
  console.log("tttt")
 
  client=req.query;
    res.header('Access-Control-Allow-Origin', "*");
    res.header('Access-Control-Allow-Methods','GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
   console.log(req,"tttt")
   next();
  })
    
    

    io.on('connection', (socket) => {
     // console.log(database_config.mysql.)
      var database={};
     
      if(socket.handshake.query.db && socket.handshake.query.db!=""){
        database=database_config.mysql[socket.handshake.query.db];
        var con = mysql.createConnection({
          host: database.host,
          user:  database.username,
          password:  database.password,
          database:  database.database
        });
      
        if(con){
          con.connect(function(err) {
            if (err) throw err;
            console.log("Mysql Connected!");
          });
        }
      }
    
      socket.on('register_user_id',function(userId,role,name,email=null,phone=null,ip=null,browser_info=null,device_info=null){   
  
       if (role == "debtor"){ 
  
         var sql = "INSERT INTO chat_user (account_number,fullname,email,phone) VALUES ('"+userId+"', '"+name+"','"+email+"','"+phone+"')";
              con.query(sql, function (err, result) {
                if (err) throw err;
                var caht_user_id=result.insertId;
               
                 var sql1 = "INSERT INTO chat_thread (to_id,from_id,is_accept,is_transfer,last_message) VALUES (NULL,'"+result.insertId+"',  '0','0','')";
              con.query(sql1, function (err, result) {
                var thread_id=result.insertId;
             user_details[caht_user_id]={"role":role,"name":name,"email":email,"phone":phone,"ip":ip,"browser_info":browser_info,"device_info":device_info};
              sockets["DEB_"+caht_user_id] = socket; 
               sockets["DEB_"+caht_user_id].join("debtor");
                socket.emit('registered',caht_user_id,thread_id);
               sockets["DEB_"+caht_user_id].join("chat_"+thread_id);
  
  
               
          // console.log(all_collector);
             console.log('user id '+userId+' connected');      
  
              });
               
              });
       }else  if (role == "collector"){ 
        sockets["COL_"+userId] = socket; 
         sockets["COL_"+userId].join("collector");
   var sql = "SELECT chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.is_transfer,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.to_id='"+userId+"' and is_accept=1 and is_closed=0";
          con.query(sql, function (err, result) {
              result.forEach(function(item, index){
  
                        sockets["COL_"+userId].join("chat_"+item.thread_id);
              });
  
          });
  
        //sockets["COL_"+item.to_id] = socket; 
      //   sockets["COL_"+item.to_id].join("chat_"+item.thread_id);
        console.log("joined collector",userId)
  
       } 
      });
    socket.on('msg_to_collector', (debtor_id,thread_id,message,ip=null,browser_info=null,device_info=null) => 
    {
        var sql = "SELECT chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.is_transfer,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.id='"+thread_id+"'";
          con.query(sql, function (err, result) {
            if(result.length==1){
                result.forEach(function(item, index){
                      if(item.is_accept==0){
                           var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,browser_info,device_info,ipaddress) VALUES (NULL,'DEB_"+debtor_id+"', '"+item.thread_id+"', '"+message+"','"+browser_info+"','"+device_info+"','"+ip+"')";
                          con.query(sql1, function (err1, result1) {
                            $sql2="UPDATE chat_thread SET last_message='"+message+"',file_type='' WHERE from_id="+debtor_id;
                             con.query($sql2, function (err2, result2) {
  
                               socket.to("collector").emit('mgs_req_from_debtor', item.fullname,message,debtor_id,item.thread_id,item.account_number);
                               
                             });
                           });
                      }else{
                              var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,browser_info,device_info,ipaddress) VALUES ('COL_"+item.to_id+"','DEB_"+debtor_id+"', '"+item.thread_id+"', '"+message+"','"+browser_info+"','"+device_info+"','"+ip+"')";
                              console.log(sql1)
                          con.query(sql1, function (err1, result1) {
  
                            sql2="UPDATE chat_thread SET last_message='"+message+"' ,file_type='' WHERE from_id="+debtor_id;
                            
                             con.query(sql2, function (err2, result2) {
                                console.log(item.fullname,message,debtor_id,item.thread_id,item.account_number)
   
                                io.in("chat_"+item.thread_id).emit('mgs_from_debtor', item.fullname,message,debtor_id,item.thread_id,item.account_number);
                               
                             });
                           });
                      }
                 
                });
              
  
            }
  
          });
       
  
    });
  
           socket.on('collector_fileupload', (file_type,collector_id,thread_id,message,ip=null,browser_info=null,device_info=null) => 
    {
  
      var sql = "SELECT collectorinfo.collectorfullname,collectors_pivot.cImage,chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.is_transfer,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id  LEFT JOIN collectorinfo on collectorinfo.id=chat_thread.to_id LEFT JOIN collectors_pivot on collectors_pivot.cid=collectorinfo.id WHERE chat_thread.id='"+thread_id+"'";
          con.query(sql, function (err, result) {
            if(result.length==1){
               result.forEach(function(item, index){
                  if(item.is_accept==1){
                      var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,file_type,browser_info,device_info,ipaddress) VALUES ('DEB_"+item.from_id+"','COL_"+collector_id+"', '"+item.thread_id+"', '"+message+"','"+file_type+"','"+browser_info+"','"+item.from_id+"','"+ip+"')";
                              console.log(sql1)
                          con.query(sql1, function (err1, result1) {
  
                                var cImage='images/noimage.jpg'+'noimage.jpg';
                                if(item.cImage!=''){
                                  cImage='collectorsImage/'+item.cImage;
                                } 
                           
                                console.log(item.fullname,message,item.from_id,item.thread_id,item.account_number)
   
                                socket.to("chat_"+item.thread_id).emit('msg_to_accept_debtors_file_response', item.collectorfullname,cImage,message,collector_id,item.thread_id,item.from_id,file_type);
                               
                            
                           });
                  }
               });
  
            }
          });
  });
      socket.on('msg_to_accept_debtors', (collector_id,thread_id,message,ip=null,browser_info=null,device_info=null) => 
    {
   var sql = "SELECT collectorinfo.collectorfullname,collectors_pivot.cImage,chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.is_transfer,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id  LEFT JOIN collectorinfo on collectorinfo.id=chat_thread.to_id LEFT JOIN collectors_pivot on collectors_pivot.cid=collectorinfo.id WHERE chat_thread.id='"+thread_id+"'";
          con.query(sql, function (err, result) {
            if(result.length==1){
               result.forEach(function(item, index){
                  if(item.is_accept==1){
                      var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,browser_info,device_info,ipaddress) VALUES ('DEB_"+item.from_id+"','COL_"+collector_id+"', '"+item.thread_id+"', '"+message+"','"+browser_info+"','"+item.from_id+"','"+ip+"')";
                              console.log(sql1)
                          con.query(sql1, function (err1, result1) {
  
                                var cImage='images/noimage.jpg'+'noimage.jpg';
                                if(item.cImage!=''){
                                  cImage='collectorsImage/'+item.cImage;
                                } 
                           
                                console.log(item.fullname,message,item.from_id,item.thread_id,item.account_number)
   
                                socket.to("chat_"+item.thread_id).emit('msg_to_accept_debtors_response', item.collectorfullname,cImage,message,collector_id,item.thread_id,item.from_id);
                               
                            
                           });
                  }
               });
  
            }
          });
    });
        socket.on('debtor_fileupload', (message,thread_id,debtor_id,file_type,ip=null,browser_info=null,device_info=null) => 
    {
  
  var sql = "SELECT collectorinfo.collectorfullname,collectors_pivot.cImage,chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.is_transfer,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id  LEFT JOIN collectorinfo on collectorinfo.id=chat_thread.to_id LEFT JOIN collectors_pivot on collectors_pivot.cid=collectorinfo.id WHERE chat_thread.id='"+thread_id+"'";
          con.query(sql, function (err, result) {
            
              if(result.length==1){
               result.forEach(function(item, index){
                 if(item.is_accept==0){
                      var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,file_type,browser_info,device_info,ipaddress) VALUES (NULL,'DEB_"+debtor_id+"', '"+item.thread_id+"', '"+message+"','"+file_type+"','"+browser_info+"','"+item.from_id+"','"+ip+"')";
                        console.log(sql1,"test")
                       con.query(sql1, function (err2, result2) {
                              $sql2="UPDATE chat_thread SET last_message='"+message+"',file_type='"+file_type+"' WHERE from_id="+debtor_id;
                             con.query($sql2, function (err2, result2) {
                                 
                                socket.to("chat_"+item.thread_id).emit('mgs_from_debtor', item.fullname,message,debtor_id,item.thread_id,item.account_number,file_type);
                               
                             });
                               socket.to("collector").emit('mgs_req_from_debtor', item.fullname,message,debtor_id,item.thread_id,item.account_number,file_type);
                               
                             });
                 }else{
                  
                      var sql1 = "INSERT INTO chat_system (to_id,from_id,thread_id,message,file_type,browser_info,device_info,ipaddress) VALUES ('COL_"+item.to_id+"','DEB_"+debtor_id+"', '"+item.thread_id+"', '"+message+"','"+file_type+"','"+browser_info+"','"+device_info+"','"+ip+"')";
                           
                          con.query(sql1, function (err1, result1) {
                            $sql2="UPDATE chat_thread SET last_message='"+message+"',file_type='"+file_type+"' WHERE from_id="+debtor_id;
                             con.query($sql2, function (err2, result2) {
                                 
                                socket.to("chat_"+item.thread_id).emit('mgs_from_debtor', item.fullname,message,debtor_id,item.thread_id,item.account_number,file_type);
                               
                             });
                           });
                 }
               });
             }
  
          });
  
    });
      
            
  
   socket.on('chataccept', (thread_id,collector_id) => 
    {     var sql = "SELECT chat_thread.file_type,chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.last_message,chat_thread.date,chat_thread.updated_date,chat_user.id as debtor_id,chat_user.fullname,chat_user.account_number FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.id='"+thread_id+"'";
         con.query(sql, function (err, result) {
              if(result.length==1){
                  result=result[0];
  
              $sql2="UPDATE chat_thread SET is_accept=1,to_id="+collector_id+",updated_date=updated_date WHERE id="+thread_id;
            //  console.log($sql2)
              con.query($sql2, function (err1, result1) {
               $sql3="UPDATE chat_system SET to_id='COL_"+collector_id+"',is_seen=1 WHERE thread_id="+thread_id;
                 con.query($sql3, function (err1, result1) {
                       sockets["COL_"+collector_id] = socket; 
                        sockets["COL_"+collector_id].join("chat_"+thread_id);
  
                          socket.to("collector").emit('chataccept_response', thread_id,collector_id);
                        io.in("chat_"+thread_id).emit('chat_accept_response', collector_id, result.debtor_id,thread_id,result.fullname,result.last_message,result.date,result.updated_date,result.file_type);
                });
              });
  
              }
          });
  
    });
   socket.on('chatclosed', (thread_id,collector_id) => 
    { var sql = "SELECT chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.last_message,chat_thread.date,chat_thread.updated_date,chat_user.id as debtor_id,chat_user.fullname,chat_user.account_number,chat_thread.file_type,chat_user.is_online FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.id='"+thread_id+"'";
         con.query(sql, function (err, result) {
              if(result.length==1){
                  result=result[0];
                $sql2="UPDATE chat_thread SET is_closed=1,updated_date=updated_date WHERE id="+thread_id;
                 con.query($sql2, function (err1, result1) {
                    io.in("chat_"+thread_id).emit('chat_closed_response', collector_id, result.debtor_id,thread_id,result.fullname,result.last_message,result.date,result.updated_date,result.file_type,result.is_online);
  
                 });
  
              }
              });
  
    });
    socket.on('transfer_chat', (thread_id,collector_id) => 
    {
      var sql = "SELECT chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.last_message,chat_thread.date,chat_thread.updated_date,chat_user.id as debtor_id,chat_user.fullname,chat_user.account_number,chat_thread.file_type,chat_user.is_online FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.id='"+thread_id+"'";
        con.query(sql, function (err, result) {
           if(result.length==1){
               result=result[0];
             $sql2="UPDATE chat_thread SET is_transfer=1,to_id="+collector_id+",updated_date=updated_date WHERE id="+thread_id;
              con.query($sql2, function (err1, result1) {
                   sockets["COL_"+result.to_id].leave("chat_"+thread_id)
                        sockets["COL_"+collector_id].join("chat_"+thread_id);
  
                  io.in("chat_"+thread_id).emit('transfer_chat_response', collector_id, result.debtor_id,thread_id,result.fullname,result.last_message,result.date,result.updated_date,result.file_type,result.is_online);
             });
                  
           }
        });
    });
    socket.on('chat_accept_post_other', (thread_id,collector_id) => {
       var sql = "SELECT chat_thread.id as thread_id,chat_thread.to_id,chat_thread.from_id,chat_thread.is_accept,chat_thread.is_transfer,chat_thread.last_message,chat_thread.date,chat_thread.updated_date,chat_user.id as debtor_id,chat_user.fullname,chat_user.account_numberchat_thread.file_type FROM chat_thread JOIN chat_user on chat_user.id=chat_thread.from_id WHERE chat_thread.id='"+thread_id+"'";
       console.log("chat_accept_post_other")
         con.query(sql, function (err, result) {
              if(result.length==1){
                  result=result[0];
                     sockets["COL_"+collector_id] = socket; 
            sockets["COL_"+collector_id].join("chat_"+thread_id);
        io.in("chat_"+thread_id).emit('chat_accept_response_other', collector_id, result.debtor_id,thread_id,result.fullname,result.last_message,result.date,result.updated_date,result.file_type);
  
                }
              });
       
    });
  
  
  
   
      socket.on('typing_col', (thread_id,name,status) => 
    {
      console.log(thread_id,name,status,"typing_col")
       io.in("chat_"+thread_id).emit('typing_col_response', thread_id, name,status);
    });
     socket.on('typing', (thread_id,name,status) => 
    {
       console.log( thread_id,name,status );   
        
           
         socket.to("collector").emit('is_debtor_typing',thread_id,name,status);            
     
  
    });
    socket.on('join_debtor', (debtor_id,thread_id) => {
       sockets["DEB_"+debtor_id] = socket; 
         sockets["DEB_"+debtor_id].join("chat_"+thread_id);
       console.log('join_debtor',thread_id)
       $sql2="UPDATE chat_user SET is_online=1 WHERE id="+debtor_id;
        con.query($sql2, function (err1, result1) {
             socket.to("collector").emit('is_online', debtor_id);
        });
               
    });
     socket.on('disconnect', () => {
  
      let key = Object.keys(sockets)[Object.values(sockets).indexOf(socket)];
      console.log(key +" user id is disconnected");
      if (key != null)
       {
        keys=key.split("_");
        if(keys[0]=="DEB"){
               $sql2="UPDATE chat_user SET is_online=0 WHERE id="+keys[1];
                 con.query($sql2, function (err1, result1) {
            socket.to("collector").emit('is_ofline', keys[1]);
        });
                  
        }else{
  
        }
       
       }
      
      
    });
  });
 








http.listen(4000, function(){
    console.log('listening on *:4000');

});







