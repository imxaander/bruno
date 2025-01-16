class Response{
  constructor(name, message, failedStatus){
    this.name = name;
    this.failed = failedStatus;
    this.message = message;
  };
}
const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');

const { BrunoSystem, Game, g_log} = require('./game.js');
const { disconnect } = require('node:process');
const { log } = require('node:console');

var System = new BrunoSystem();

const app = express();
const server = createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'views/game.html'));
});

// app.get('/game', (req, res) => {
//   res.sendFile(join(__dirname, 'views/game.html'));
// });


io.on('connection', (socket) => {
  g_log('INFO', 'SERVER', 'A user connected to the socket server.');

  socket.on('get_rooms', ()=>{
    let rooms = System.getRooms();

    socket.emit('room_list_return', rooms);
  });

  socket.on('create_new_game', (game_info)=>{
    console.log('game info');
    console.log(game_info);
    System.newGame(game_info.player_info.id, game_info.name);
  });

  socket.on('player_join_game', (join_info)=>{
    let result = System.playerJoinGame(join_info);
    if(result == false){
      console.log("failed");
      let err = {
        failed: true,
        message: "Sad little boy, theres an error bro...",
      }
      socket.emit('player_join_return', err);
      return;
    };

    let succ = {
      failed : false,
      game_id: join_info.game_id,
      game_name: join_info.game_name,
      host_id: result
    }
    console.log(succ);
    socket.emit('player_join_return', succ);
    io.sockets.emit('players_in_lobby_return', System.getPlayersInGame(join_info.game_id))

  })

  socket.on('player_game_start', (game_id)=>{
    if(System.startGame(game_id)){
      io.sockets.emit('player_game_start_return', {failed: false, game_id: game_id});
      return;
    }
    socket.emit('player_game_start_return', {failed: true, game_id: game_id});
  })

  socket.on('get_players_in_lobby', (game_id)=>{
    socket.emit('players_in_lobby_return', System.getPlayersInGame(game_id))
  })

  socket.on('player_leave_game', (kickInfo)=>{
    console.log("pls leave");
    
    if(!System.playerLeaveGame(kickInfo)){
      socket.emit('player_leave_return', {failed: true});
      return;
    };
    socket.emit('player_leave_return', {failed: false});

    io.sockets.emit('players_in_lobby_return', System.getPlayersInGame(kickInfo.game_id))
  });

  socket.on('disconnect', ()=>{
    console.log("bruh")
    socket.emit('client_disconnect');
  });
});

g_log('INFO', 'SERVER', 'Starting server...');
server.listen(3000, () => {
  g_log('SUCCESS', 'SERVER', 'Server is running at http://localhost:3000');
  //TESTS 
});

