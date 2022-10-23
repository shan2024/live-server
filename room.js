const {createServer} = require("http");
const httpServer = createServer();

const io = require("socket.io")(httpServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true
  }
});


const port = 3333;

io.on('connection', (socket) => {
  socket.on('join_room', (roomCode)=> {
    // Create new Room if one does not exist, otherwise need to emit current state of the canvas to client
    if (rooms.containsRoom(roomCode)) {
      socket.emit("server_canvas_default", rooms.getRoom(roomCode).getState());
    } else {
      rooms.addRoom(roomCode);
    }

    // Room code is guaranteed to be valid, so anyone can join
    socket.join(roomCode);
  })

  socket.on('client_canvas_state', (canvasState)=> {
    // Need to broadcast message to all other clients in the socket room
    socket.rooms.forEach((room)=> {
      if (room !== socket.id) {
        io.to(room).emit("server_canvas_state",canvasState);
        
        // Need to also add the canvas state to the client's room
        rooms.getRoom(room).addState(canvasState);
      }
    })

  })

  socket.on('client_clear', () => {
    socket.rooms.forEach((room)=> {
      if (room !== socket.id) {
        io.to(room).emit("server_clear");

        // Need to also clear the canvas state of the client's room
        rooms.getRoom(room).clearState();
      }
    })
    console.log("recieved clear message");
  })
});


httpServer.listen(process.env.PORT || port, () => {
  console.log("Listening on port " + port);
})


// This class keeps store of all rooms in the server.
class RoomContainer {
  rooms// Contains all of the rooms

  constructor(){
    this.rooms = new Map();
  }

  // Returns the room with the given code
  getRoom(code){
    return this.rooms.get(code);
  }

  // Returns true if a room with the given roomCode exists
  containsRoom(roomCode) {
    return this.rooms.has(roomCode);
  }

  // Adds a new Room with the given roomCode
  addRoom(roomCode) {
    this.rooms.set(roomCode, new Room());
  }
}

// A Room keeps track of the underlying canvas state so that it
// can be broadcast to all participants.
class Room {
  states;

  constructor() {
    this.states = [];
  }

  getState() {
    return this.states;
  }

  addState(newState) {
    console.log("changed state");
    this.states.push(newState);
  }

  clearState() {
    this.states.length = 0;
  }

}

// Global room container
const rooms = new RoomContainer();