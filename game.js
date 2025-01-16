function g_log(type, part, message){
	console.log(`[${part}] - ${type}: ${message}`);
}
class Cards{
	id;
	display_name;
	image;
}

class NumberCards extends Cards{
	number; //number
	color; //color
}

class ReverseCards extends Cards{
	color; //color
}

class SkipCards extends Cards{
	color; //color
}

class SpecialCards extends Cards{
	effectDescription; //string
	effect; //function
}
class DrawCards extends SpecialCards{
	additionalCards; //number
}

class Draw4Cards extends DrawCards{
	additionalCards = 4;
}

class Draw2Cards extends DrawCards{
	additionalCards = 4;
	color;
}

class SwitchColorCards extends SpecialCards{

}

class ShuffleCards extends SpecialCards{
	
}


class Player{
	constructor(id, name){
		this.id = id;
		this.name = name;
		this.hand = []; //array of cards
		this.isTurn = false; //bool
		this.isHost = false;
	}
}

class Deck{
	constructor() {
        this.cards = [];
    }

    Draw() {
        if (this.items.length === 0) {
            return "Underflow";
        }
        return this.items.pop();
    }

    Insert(card){
    	cards.push(card);
    }
}

class Pile{
	constructor() {
        this.cards = [];
    }

    Insert(element) {
        this.items.push(element);
    }

}

//game contains all mechanics of the game, and changes player's shit
class Game{
	constructor(host_id, name){
		console.log("constr: " + host_id + "-------");
		
		this.host_id = host_id; //player_id
		this.name = name; //name of game/room
		this.id = Math.floor((Math.random() * 999) + 1); 

		this.is_prepping = true;
		this.is_ongoing = false;
		this.is_concluding = false;
		this.players = []; //player array
		this.currentPlayer; //index of the current player
		this.actions = {
			TurnNumberCard : (args) => {
			// args
			}, 
		}

		this.cardsAmmount{
			
		}
	}
	
	start(){
		//initiate pile

		//give cards to players, 10
		return true;
	};

	loop(){

	}

	stop(){

	};

	addPlayer(player_info){
		g_log('INFO', 'GAME', `Adding a player to game ${this.id}`);
		console.log("add players");
		console.log(player_info);
		let playerToAdd = new Player(player_info.id, player_info.name);

		if(player_info.id == this.host_id){
			playerToAdd.isHost = true;
		}
		if(this.players.push(playerToAdd)){
			return true;
		}

		return false;
	};
	deletePlayer(player_id){
		g_log('INFO', 'GAME', `Deleting a player to game ${this.id}`);
		if(this.players.splice(this.getPlayerIndexWithId(player_id), 1)){
			return true;
		};

		return false;
	}
	//TODO: deleteplayer
	getPlayerCount(){
		return this.players.length;
	}

	nextTurn(player_index){};

	getPlayers(){
		return this.players;
	}
	getPlayerIndexWithId(player_id){
		let c = 0;
		this.players.forEach((player, index)=>{
			// console.log(game)
			if(player.id == player_id){
				 c = index;
			}
		})

		return c;
	}
}


/*==========================================
	SYSTEM SOCKET EMIT EVENTS FORMAT
============================================

	 ______________________________________________________________________________________	
	| EVENT_TYPE 	| EVENT ARGS 															|
	 ---------------------------------------------------------------------------------------
	| GAME_ACTION	| game_id, player_id, action_name (in actions), card played (optional)	|
	| 				| 

*/

class BrunoSystem{
	constructor(){
		this.games = [];	
	}

	newGame(host_player_id, name){
		g_log('INFO', 'BRUNO_SYSTEM', 'Creating a game...')
		this.games.push(new Game(host_player_id, name));
		g_log('SUCCESS', 'BRUNO_SYSTEM', `Created a game/room (name: ${name}, host_id: ${host_player_id})`);
	}

	getRooms(){
		if(this.games.length == 0){
			return null;
		}

		let rooms = [];
		this.games.forEach((game)=>{
			rooms.push({
				id : game.id,
				name : game.name,
				playerCount : game.getPlayerCount(),
			})
		})

		return rooms;
	}

	getGameIndexWithId(game_id){
		let c = -1;
		this.games.forEach((game, index)=>{
			// console.log(game)
			if(game.id == game_id){
				 c = index;
			}
		})

		return c;
		// return this.games.map(function(e) { return e.id; }).indexOf(game_id);
	}

	playerJoinGame(joinInfo){
		let gameIndex = this.getGameIndexWithId(joinInfo.game_id);

		// console.log("Game Index: " + gameIndex + ", Game_id: " + joinInfo.game_id);
		g_log('INFO', 'BRUNO_SYSTEM', `Player with PID: ${joinInfo.player_info.id} is joining game ${joinInfo.game_id}`);

		if(!this.games[gameIndex].addPlayer(joinInfo.player_info)){
			g_log('ERROR', 'GAME.addPlayer', `Cannot add player ${joinInfo.player_info.id}`);
			return false;
		};

		g_log('SUCCESS', 'BRUNO_SYSTEM', `Player with PID: ${joinInfo.player_info.id} successfully joined game ${joinInfo.game_id}`);
		return this.games[gameIndex].host_id;
	}
	
	playerLeaveGame(kickInfo){
		let gameIndex = this.getGameIndexWithId(kickInfo.game_id);
		if(gameIndex == -1){
			g_log('WARNING', 'BRUNO_SYSTEM', `Player with PID: ${kickInfo.player_id} looks like he's in a game that do not exist. updating his/her data.. GAMEID: ${kickInfo.game_id}`);
		}else{
			g_log('INFO', 'BRUNO_SYSTEM', `Player with PID: ${kickInfo.player_id} is going to be kicked in game ${kickInfo.game_id}`);
			if(!this.games[gameIndex].deletePlayer(kickInfo.player_id)){
				g_log('ERROR', 'GAME.addPlayer', `Cannot delete player ${kickInfo.player_id}`);
				return false;
			}
		};

		g_log('SUCCESS', 'BRUNO_SYSTEM', `Player with PID: ${kickInfo.player_id} successfully left/kicked in game ${kickInfo.game_id}`);
		return true;
	}

	getPlayersInGame(game_id){
		let gameIndex = this.getGameIndexWithId(game_id);
		if(gameIndex == -1){
			return false;
		}
		return this.games[gameIndex].getPlayers();
	}
	
	startGame(game_id){
		let gameIndex = this.getGameIndexWithId(game_id);
		g_log('INFO', 'BRUNO_SYSTEM', `Trying to start game ${game_id}...`);
		if(this.games[gameIndex].start()){
			g_log('SUCCESS', 'BRUNO_SYSTEM', `Game ${game_id} has Started!`);
			return true;
		};
		return false;
	}
	
	processEmits(){

	}
}

module.exports = {
    Cards,
    NumberCards,
    ReverseCards,
    SkipCards,
    SpecialCards,
    DrawCards,
    Draw4Cards,
    Draw2Cards,
    SwitchColorCards,
    ShuffleCards,
    Player,
    Deck,
    Pile,
    Game,
    BrunoSystem,

    //functions
    g_log
}