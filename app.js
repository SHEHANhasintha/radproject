var createError = require('http-errors');
var express = require('express');
var http = require('http');
var debug = require('debug')('radproject:server');
var { Server } = require('socket.io');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var uuid = require('uuid');


var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


var app = express();

let dataStoreSocketId = {};
let dataStoreUserName = {};
let dataStoreRooms = {};

var port = normalizePort(process.env.PORT || 5000);
app.set('port', port);
const server = http.createServer(app);
const ioServer = new Server(server,{
  cors: {
    origin: "http://localhost:3000",
    methods: '*'
  }
});


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


server.listen(port);
server.on('error', onError);
server.on('listening', onListening);


function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  console.log("server running on", bind)
  debug('Listening on ' + bind);
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}


ioServer.on('connection', function(socket){
  // console.log('a user connected');

  var clients = socket.id;
  console.log('clients', clients);



  

  socket.on('dataConf', (data) => {
    if (data.hasOwnProperty('userName')) {
      dataStoreSocketId[socket.id] = {'userName': data.userName};
      dataStoreUserName[data.userName] = {'socketId': socket.id};
      console.log('connected to client', dataStoreSocketId, dataStoreUserName);
    }else{
      socket.emit('connection');
    }
    
  })

  socket.on('connection', (data) => {
    if (data.hasOwnProperty('userName')) {
      dataStoreSocketId[socket.id] = {'userName': data.userName};
      dataStoreUserName[data.userName] = {'socketId': socket.id};
      console.log('connected to client', dataStoreSocketId);
    }
    
  })

  socket.on('create-room', (data) => {
    console.log('create-room', data);
    const room = {
      roomId: uuid.v4(),
      roomName: data.roomName,
      roomType: data.roomType,
      roomOwner: [data.userName],
      roomMembers: [data.userName],
      roomCreated: new Date(),
      roomUpdated: new Date(),
      roomStatus: 'active',
      roomDescription: data.roomDescription,
      roomImage: data.roomImage,
      roomCapacity: data.roomCapacity,
      roomPolicies: data.roomPolicies,
    }

    socket.join(room.roomId);
    dataStoreRooms[room.roomId] = room;
    ioServer.to(room.roomId).emit("room-created", room);
  })

  socket.on('add-to-room', (data) => {
    console.log('add-to-room', data);
    const roomMember = data.roomMateId;
    dataStoreRooms[data.roomId].roomMembers.push(roomMember);
    const room = dataStoreRooms[data.roomId];
    ioServer.to(room.roomId).emit("room-joined", room);
  })



  socket.on('reconnect', (data) => {
    if (data.hasOwnProperty('userName')) {
      dataStoreSocketId[socket.id] = {'userName': data.userName};
      // dataStoreUserName[data.userName] = {'socketId': socket.id};
      console.log('connected to client', dataStoreSocketId);
    }
    
  })

  socket.emit('connection');

  socket.on('message', (data) => {
    // socket.emit(data[userId], "hey how are you doing?");
    let clientId = dataStoreUserName[data.msgFrom].socketId;
    dataStoreUserName[data.msgFrom].socketId = socket.id;
    let priData = dataStoreSocketId[clientId];
    delete dataStoreSocketId[clientId];
    dataStoreSocketId[socket.id] = priData;
    console.log(data, 'data receiveddddddddddddddddddddddddddddd',dataStoreSocketId,dataStoreUserName,data.msgFrom.trim(),data.msgTo);

    socket.broadcast.emit(data.msgTo.trim(), data.msg);
    // socket.broadcast.emit('hello',data.msg);

    
  
  })

  socket.on('disconnect', () => {
    var client = socket.id;

    let rrr = dataStoreSocketId[client];
    console.log('user disconnected', rrr, client);
    if (client in dataStoreSocketId) {
      console.log('user disconnected', dataStoreSocketId[client]);
      delete dataStoreUserName[dataStoreSocketId[client].userName];
    }
    delete dataStoreSocketId[client];


    console.log(dataStoreSocketId,dataStoreUserName)
  });

});

// ioServer.on("connection", socket => {
  
//   console.log("user room", socket.id)

//   socket.on("join-room", data => {
//     console.log("join-room", socket.id);
//     socket.join("room1");
//     ioServer.to("room1").emit("someevent", "some data");
//   });

// });




