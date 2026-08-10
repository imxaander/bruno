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

app.use('/assets', express.static(join(__dirname, './assets')));

app.get('/gameStyle', (req, res)=>{
  res.sendFile(join(__dirname, 'src/css/game.css'))
})

io.on('connection', (socket) => {
  g_log('INFO', 'SERVER', 'A user connected to the socket server.');

  socket.on('get_rooms', ()=>{
    let rooms = System.getRooms();

    socket.emit('room_list_return', rooms);
  });


  //game_create
  socket.on('create_new_game', (game_info)=>{
    console.log('game info');
    console.log(game_info);
    System.newGame(game_info.player_info.id, game_info.name);
  });

  //player_join
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

  //game_start
  socket.on('player_game_start', (game_id)=>{
    if(System.startGame(game_id, socket, io)){
      io.sockets.emit('player_game_start_return', {failed: false, game_id: game_id});
      return;
    }
    socket.emit('player_game_start_return', {failed: true, game_id: game_id});
  })

  //get_players
  socket.on('get_players_in_lobby', (game_id)=>{
    socket.emit('players_in_lobby_return', System.getPlayersInGame(game_id))
  })

  //player_leave
  socket.on('player_leave_game', (kickInfo)=>{
    console.log("pls leave");
    
    if(!System.playerLeaveGame(kickInfo)){
      socket.emit('player_leave_return', {failed: true});
      return;
    };
    socket.emit('player_leave_return', {failed: false});

    io.sockets.emit('players_in_lobby_return', System.getPlayersInGame(kickInfo.game_id))
  });

  socket.on('get_client_game_state', (info)=>{
    g_log('INFO', 'BRUNO_SYSTEM', `Getting client game state for ${info.player_id}, in ${info.game_id}`)
    
    let cGS = System.getClientGameState(info.game_id, info.player_id);

    //g_log('DEBUG', 'BRUNO_SYSTEM', `This is the game state for ${info.player_id}`);
    // console.log(cGS);
    
    if(cGS != false){
      socket.emit('get_client_game_state_return', cGS);
      return;
    }
  })


  socket.on('game_input_action', (action)=>{
    //this is where an object is passed, that contains everything,
    let testaction = {
      game_id: "",

      //type of action
      //  1. play card
      //  2. draw card
      type: "", // play or draw
      
      //player_id of the doer of the action, 
      //  can also be the index of the player for faster search
      player_index: 0, //player index would be good, but we have a function to validate this, so... it's okay if there is none
      player_id: "", //to lessen the packet we give, its better to not include the id, 
      card_index: 0, //card index, it's better security for card id 
    }

    let actionResult =  System.gameActionHandle(action);

    //if the action is valid, we give the action to everyone in the game,

    //if the action is not valid, we give it to the sender of the action

  });
  //disconnect
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

