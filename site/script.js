var videos = [];
var PeerConnection = window.PeerConnection || window.webkitPeerConnection00 || window.webkitRTCPeerConnection || window.mozRTCPeerConnection || window.RTCPeerConnection;
var download = document.getElementById("download_file");
var test = document.getElementById('test');
var url = "http://localhost:8080/test+2.Economy+actual+test.pdf";
var filename = "test+2.Economy+actual+test.pdf";

function getNumPerRow() {
  var len = videos.length;
  var biggest;

  // Ensure length is even for better division.
  if(len % 2 === 1) {
    len++;
  }

  biggest = Math.ceil(Math.sqrt(len));
  while(len % biggest !== 0) {
    biggest++;
  }
  return biggest;
}

function subdivideVideos() {
  var perRow = getNumPerRow();
  var numInRow = 0;
  for(var i = 0, len = videos.length; i < len; i++) {
    var video = videos[i];
    setWH(video, i);
    numInRow = (numInRow + 1) % perRow;
  }
}

function setWH(video, i) {
  var perRow = getNumPerRow();
  var perColumn = Math.ceil(videos.length / perRow);
  var width = Math.floor((window.innerWidth) / perRow);
  var height = Math.floor((window.innerHeight - 190) / perColumn);
  video.width = width;
  video.height = height;
  video.style.position = "absolute";
  video.style.left = (i % perRow) * width + "px";
  video.style.top = Math.floor(i / perRow) * height + "px";
}

function cloneVideo(domId, socketId) {
  var video = document.getElementById(domId);
  var clone = video.cloneNode(false);
  clone.id = "remote" + socketId;
  document.getElementById('videos').appendChild(clone);
  videos.push(clone);
  return clone;
}

function removeVideo(socketId) {
  var video = document.getElementById('remote' + socketId);
  if(video) {
    videos.splice(videos.indexOf(video), 1);
    video.parentNode.removeChild(video);
  }
}

function addToChat(msg, color) {
  var messages = document.getElementById('messages');
  msg = sanitize(msg);
  if(color) {
    msg = '<span style="color: ' + color + '; padding-left: 15px">' + msg + '</span>';
  } else {
    msg = '<strong style="padding-left: 15px">' + msg + '</strong>';
  }
  messages.innerHTML = messages.innerHTML + msg + '<br>';
  messages.scrollTop = 10000;
}

function sanitize(msg) {
  return msg.replace(/</g, '&lt;');
}

// function initFullScreen() {
//   var button = document.getElementById("fullscreen");
//   button.addEventListener('click', function(event) {
//     var elem = document.getElementById("videos");
//     //show full screen
//     elem.webkitRequestFullScreen();
//   });
// }

function initNewRoom() {
  var button = document.getElementById("newRoom");

  button.addEventListener('click', function(event) {

    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var string_length = 8;
    var randomstring = '';
    for(var i = 0; i < string_length; i++) {
      var rnum = Math.floor(Math.random() * chars.length);
      randomstring += chars.substring(rnum, rnum + 1);
    }

    window.location.hash = randomstring;
    location.reload();
  })
}


var websocketChat = {
  send: function(message) {
    rtc._socket.send(message);
  },
  recv: function(message) {
    return message;
  },
  event: 'receive_chat_msg'
};

var dataChannelChat = {
  send: function(message) {
    console.log(rtc.dataChannels);
    for(var connection in rtc.dataChannels) {
      var channel = rtc.dataChannels[connection];
      channel.send(message);
    }
  },
  recv: function(channel, message) {
    return JSON.parse(message).data;
  },
  event: 'data stream data'
};

var dataChannelData = {
  
  sendReq: function(urlToken) {
    console.log("socketid send " + mysocketid);
    var send_data = {
      eventName: "REQ_DATA",
      status: '',
      from: mysocketid,
      data: {
        id: urlToken,
        message: "Request data"
      }
    }
    for(var connection in rtc.dataChannels) {
      var channel = rtc.dataChannels[connection];
      channel.send(JSON.stringify({send_data}));
    }
  },
  recv_data: function(hash, data) {
    //console.log(JSON.parse(data).data);
    var re_data = JSON.parse(data).send_data;
    if(re_data.eventName == "REQ_DATA") {
      var get_data = getMemory(hash, re_data.data.id);
      console.log(get_data);
      if(re_data.status == 'OK') {
        console.log("Share data with id: " + re_data.data.id);
        var send_data = {
          eventName: "RES_DATA",
          from: mysocketid,
          status: 'send',
          data: {
            id: re_data.data.id,
            data: get_data
          }
        }
        //send data
        console.log("socket id from " + re_data.from);
        var channel = rtc.dataChannels[re_data.from];
        channel.send(JSON.stringify({send_data}));
      
      }
      if(get_data != false && get_data != undefined) {
        console.log("Gui trang thai da tim duoc du lieu");
        var send_data = {
          eventName: "RES_FOUND",
          from: mysocketid,
          data: {
            id: re_data.data.id
          }
        }
        //send data
        rtc.dataChannels[re_data.from].send(JSON.stringify({send_data}));
      }
      else {
        var send_data = {
          eventName: "RES_NOTFOUND"
        }
        rtc.dataChannels[re_data.from].send(JSON.stringify({send_data}));
      }
    }
    else if(re_data.eventName == "RES_DATA") {
      console.log("Receive data from" + re_data.from + "with data" + re_data.data);
      saveMemory(re_data.data, hash);
    }
    else if(re_data.eventName == "RES_FOUND") {
      console.log("Nhan trang thai tim duoc du lieu");
      var send_data = {
          eventName: "REQ_DATA",
          status:"OK",
          from: mysocketid,
          data: {
            id: re_data.data.id
          }
        }

        //send data
        rtc.dataChannels[re_data.from].send(JSON.stringify({send_data}));
    }
      
    else if(data.eventName == "RES_NOTFOUND") {

    }
  },
  event: 'data stream data'
}

var cache = {
    stack:{},
    load: function(id) { 
      return (typeof(this.stack[id]) != 'undefined') ? this.stack[id] : false;
    },
    save: function(data,id) { 
      this.stack[id] = data;
    },
    remove: function(id) {
      if(typeof(this.stack[id]) != 'undefined')
        delete this.stack[id];
    }
}

var createRequestServer = function(method, url, range) {
    var xhr = new XMLHttpRequest();
    xhr.open(method,url,true);
    xhr.responseType = 'blob';
    if (range !== undefined && range !== null && range.length > 0) {
      xhr.setRequestHeader("Range", "bytes=" + range);
    }
    return xhr;
}

function saveMemory(receive_data, hashTable) {
    if(hashTable == 'undefined')
      return false;
    if(receive_data == 'undefined' || receive_data == '')
      return false;
    hashTable.setItem(receive_data.id, receive_data.data);
}

function getMemory(hashTable, key) {
    console.log(hashTable);
    if(hashTable == 'undefined') 
      return false;
    if(key == null || key == '' || key == 'undefined')
      return false;
    return hashTable.getItem(key);
}

var downFile = {
    get: function(urlToken, shareData) {
        shareData.sendReq(urlToken);

        // rtc.on(shareData.event, function(data) {
        //   var rec_data = shareData.recv_data.apply(data, hash);
        //   console.log(rec_data);
        //   //console.log("nhan ve");
        // });
    }
}

var urlRequest = {
    urlToken: function(urlReq, offset) {
        return $.md5(urlReq + offset);
    }
}

function initChat() {
  var chat;

  if(rtc.dataChannelSupport) {
    console.log('initializing data channel chat');
    chat = dataChannelChat;
  } else {
    console.log('initializing websocket chat');
    chat = websocketChat;
  }

  var input = document.getElementById("chatinput");
  var toggleHideShow = document.getElementById("hideShowMessages");
  var room = window.location.hash.slice(1);
  var color = "#" + ((1 << 24) * Math.random() | 0).toString(16);

  toggleHideShow.addEventListener('click', function() {
    var element = document.getElementById("messages");

    if(element.style.display === "block") {
      element.style.display = "none";
    }
    else {
      element.style.display = "block";
    }

  });

  input.addEventListener('keydown', function(event) {
    var key = event.which || event.keyCode;
    if(key === 13) {
      chat.send(JSON.stringify({
        "eventName": "chat_msg",
        "data": {
          "messages": input.value,
          "room": room,
          "color": color
        }
      }));
      addToChat(input.value);
      input.value = "";
    }
  }, false);
  rtc.on(chat.event, function() {
    console.log(chat.event);
    var data = chat.recv.apply(this, arguments);
    console.log(data.color);
    addToChat(data.messages, data.color.toString(16));
  });
}

function get_filesize(url,callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("HEAD", url, true);

  xhr.onreadystatechange = function() {
    if (this.readyState == this.DONE) {
          callback(parseInt(xhr.getResponseHeader("Content-Length")));
      }
  }
  xhr.send();
}

function init() {
  var shareData;
  if(rtc.dataChannelSupport) {
    shareData = dataChannelData;
  }
  else {
    shareData = websocketChat;
  }
  if(PeerConnection) {
    download.onclick = function() {
      var check = rtc.createDownload();
      
      // hash.hasItem('five');
      // hash.setItem('five',5);
      // alert(hash.getItem('five'));
      // if(check) {
      //   get_filesize(url, function(size) {
      //     console.log("File size: " + size);
      //   })

      //   var xhr = new XMLHttpRequest();
      //   xhr.open('GET', url, true);
      //   xhr.responseType = 'blob';
      //   xhr.onload = function(pe) {
      //     var blob = new Blob([this.response]);
      //     console.log(blob);
      //     var urlCreator = window.URL || window.webkitURL;
      //     var fileUrl = urlCreator.createObjectURL( blob );
      //     var a = document.createElement("a");
      //     a.style = "display: none";
      //     a.href = fileUrl;
      //     a.download = filename;
      //     a.click();
      //   }
      //   xhr.send();
      // }
    }
    test.onclick = function() {
      var token = urlRequest.urlToken(url, '0-16354');
      console.log(token);
      downFile.get(token, shareData);
    }
  } else {
    alert('Your browser is not supported or you have to turn on flags. In chrome you go to chrome://flags and turn on Enable PeerConnection remember to restart chrome');
  }

  var room = window.location.hash.slice(1);
  var index = 0;
  rtc.connect("ws:" + window.location.href.substring(window.location.protocol.length).split('#')[0], room);

  rtc.on('data stream data', function() {

    console.log(++index);
    shareData.recv_data.apply(hash, arguments);
  });

  // rtc.on('add remote stream', function(stream, socketId) {
  //   console.log("ADDING REMOTE STREAM...");
  //   var clone = cloneVideo('you', socketId);
  //   document.getElementById(clone.id).setAttribute("class", "");
  //   rtc.attachStream(stream, clone.id);
  //   subdivideVideos();
  // });
  // rtc.on('disconnect stream', function(data) {
  //   console.log('remove ' + data);
  //   removeVideo(data);
  // });
  // initFullScreen();
  initNewRoom();
  //initChat();
  // setInterval(function() {
  //     console.log(rtc.dataChannels);
  //   },5000);
}

window.onresize = function(event) {
  subdivideVideos();
};



// $(document).ready(function() {
//   $.getJSON("http://www.telize.com/geoip?callback=?",
//     function(json) {
//         console.log("Geolocation information for IP address : ", json.ip);
//         console.log("Country : ", json.country);
//         console.log("City : ", json.city);
//         console.log("Latitude : ", json.latitude);
//         console.log("Longitude : ", json.longitude);
//         console.log("ISP : ", json.isp);
//         var clientInfo = {
//           ip_public : json.ip,
//           country : json.country,
//           city : json.city,
//           isp: json.isp
//         }
//     }
//   );
// });