var express = require('express');
var app = express();
var server = require('http').createServer(app);
var webRTC = require('anhnhwebrtc.io').listen(server);

var port = process.env.PORT || 8080;
server.listen(port);

app.use(express.static(__dirname + '/public'));

app.get('/', function(req, res) {
  // var ip = req.headers['x-forwarded-for'] || 
  //    req.connection.remoteAddress || 
  //    req.socket.remoteAddress ||
  //    req.connection.socket.remoteAddress;
  // console.log(ip);
  res.sendfile(__dirname + '/index.html');
});

app.get('/style.css', function(req, res) {
  res.sendfile(__dirname + '/style.css');
});

app.get('/fullscrean.png', function(req, res) {
  res.sendfile(__dirname + '/fullscrean.png');
});

app.get('/script.js', function(req, res) {
  res.sendfile(__dirname + '/script.js');
});

app.get('/webrtc.io.js', function(req, res) {
  res.sendfile(__dirname + '/webrtc.io.js');
});

webRTC.rtc.on('chat_msg', function(data, socket) {
  var roomList = webRTC.rtc.rooms[data.room] || [];

  for (var i = 0; i < roomList.length; i++) {
    var socketId = roomList[i];

    if (socketId !== socket.id) {
      var soc = webRTC.rtc.getSocket(socketId);

      if (soc) {
        soc.send(JSON.stringify({
          "eventName": "receive_chat_msg",
          "data": {
            "messages": data.messages,
            "color": data.color
          }
        }), function(error) {
          if (error) {
            console.log(error);
          }
        });
      }
    }
  }
});
