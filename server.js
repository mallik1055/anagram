var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var url = require('url');
var ag = require('./anagram');
var path = require('path');

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/views/index.html');
});


io.on('connection', function(socket){
  console.log('a user connected');
  ag.initGame(io, socket);
  
});

server.listen(3000, function(){
  console.log('listening on *:3000');
});


