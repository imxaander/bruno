function g_log(type, part, message){
	console.log(`[${part}] - ${type}: ${message}`);
}
class ClientGameState{
	constructor(){
		this.playerCount;
		this.players;
		this.playerInTurn; //player id of the player current turn
		this.pile_state;
		this.hand_state;
	}
}

//contains number of cards for each color
class CardColor{
	constructor(name){
		this.name = name;
	}
}

class CardColors{
	static Red = new CardColor("Red");
	static Blue = new CardColor("Blue");
	static Green = new CardColor("Green");
	static Yellow = new CardColor("Yellow");
}

const DeckCardColors = [CardColors.Red, CardColors.Blue, CardColors.Yellow, CardColors.Green];
const DeckCardSet = {
	NumberCards: [
		1, 2, 2, 2, 2, 2, 2, 2, 2, 2
	//	0, 1, 2, 3, 4, 5, 6, 7, 8, 9
	], //each color

	ReverseCards: 2, //each color
	SkipCards: 2, //each color
	Draw2Cards: 2, //each color
	Draw4Cards: 4, 
	SwitchColor: 4,
	Shuffle: 1,
}

class Cards{
	constructor(display_name, image){
		this.id = this.generateCardId();
		this.display_name = display_name;

		//image asset filename;
		this.image = image; 
	}
	
	generateCardId(){
		return Math.random().toString(36).replace('0.', "CARD" || '');
	}
}

class NumberCards extends Cards{
	constructor(number, color){
		super(number, `${color.name}_${number}.png`.toLowerCase());

		this.number = number;
		this.color = color;
	}
}

class ReverseCards extends Cards{
	constructor(display_name, color){
		super(display_name, "testcard_r.png")
		this.color = color; //color
	}
}

class SkipCards extends Cards{
	constructor(display_name, color){
		super(display_name, "testcard_s.png")
		this.color = color; //color
	}
}

class SpecialCards extends Cards{
	constructor(display_name, effectDescription){
		super(display_name);
		this.effectDescription = effectDescription;
	}
}

//draw cards are cards that will change the following state of the game:
// 	drawState = true
// 	drawCurrentValue += additionalCards
class DrawCards extends SpecialCards{
	constructor(display_name, effectDescription, additionalCards){
		super(display_name, effectDescription, additionalCards)
		this.additionalCards = additionalCards;
	}
}

class Draw4Cards extends DrawCards{
	constructor(display_name){
		super(display_name, "test effect desc for draw 4", 4);
		this.image = "+4.png";
	}
}

class Draw2Cards extends DrawCards{
	constructor(display_name, color){
		super(display_name, "test effect desc for draw 2", 4);
		this.image = `${color.name}_+2.png`.toLowerCase();
		this.color = color;
	}
}

class SwitchColorCards extends SpecialCards{
	constructor(display_name){
		super(display_name, "test effect desc for switch color");
	}
}

class ShuffleCards extends SpecialCards{
	constructor(display_name){
		super(display_name, "test effect desc for shuffle");
	}	
}


class Player{
	constructor(id, name){
		this.id = id;
		this.name = name;

		this.hand = []; //array of cards
		this.handAmount = 0;

		this.isTurn = false; //bool
		this.isHost = false;
	}
}

class Deck{
	constructor() {
        this.cards = [];
    }

    Draw() {
        if (this.cards.length === 0) {
            return "Underflow";
        }
        return this.cards.pop();
    }

    Insert(card){
    	this.cards.push(card);
    }

	Shuffle(){
		for (let i = this.cards.length - 1; i >= 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
		}
	}
}

class Pile{
	constructor() {
        this.cards = [];
    }

    Draw() {
        if (this.cards.length === 0) {
            return "Underflow";
        }
        return this.cards.pop();
    }

    Insert(card){
    	this.cards.push(card);
    }
}

//game contains all mechanics of the game, and changes player's shit
class Game{
	constructor(host_id, name){
		console.log("constr: " + host_id + "-------");
		
		//basic information
		this.host_id = host_id; //player_id
		this.name = name; //name of game/room
		this.id = Math.floor((Math.random() * 999) + 1); 

		//flags (status, etc.)
		this.is_prepping = true;
		this.is_ongoing = false;
		this.is_concluding = false;

		//game state information
		this.players = []; //player array
		this.pile = null;
		this.deck = null;

		this.turnCounter = 0;
		this.currentPlayer; //index of the current player
		this.currentPlayerId; //id of the current player

		this.actions = {
			TurnNumberCard : (player_id) => {
			// args
			}, 
		}
	}
	
	start(){
		if(this.is_ongoing){
			return true;
		}
		//update flags, no use yet :p maybe for rooms :D
		this.is_ongoing = true;
		this.is_prepping = false;

		//initiate deck
		this.deck = new Deck();
		//populates deck with current DeckCardSet format
		this.populateDeck();
		
		this.deck.Shuffle()
		console.log("total cards: " + this.deck.cards.length);
	
		//initiate pile
		this.pile = new Pile();

		//pick first turn player
		this.currentPlayer = Math.floor(Math.random() * this.players.length);
		this.currentPlayerId = this.players[this.currentPlayer].id;


		//give cards to players, 8 caards
		this.distributeCards(8);
		//test to give a card to first player
		return true;
	};

	loop(){

	}

	stop(){

	};

	initClientGameState(){
		this.game_state = new ClientGameState();
	}
	
	getPlayerGameState(player_id){
		let cGS = new ClientGameState(); //client game state

		cGS.playerCount = this.players.length;
		cGS.players = this.players;
		cGS.playerInTurn = this.currentPlayerId;//player id of the player current turn
		cGS.pile_state = this.pile.cards;
		cGS.hand_state = this.players[this.getPlayerIndexWithId(player_id)].hand;
		cGS.deckCount = this.deck.cards.length;
		return cGS;
	}

	populateDeck(){
		//we can bring this event back to everyone with game_id, 
		//	but the implementation of rooms will make this easy af...
		//	for the sake of testing, try to implement it and just throw this event to everyone
		//	just validate the game_id... i think this wont hurt haha..

		//number cards
		DeckCardColors.forEach(color => {
			DeckCardSet.NumberCards.forEach((amount, number)=>{
				for(let i = 0; i < amount; i++){
					let card = new NumberCards(number, color);
					this.deck.Insert(card);
				}
			})

			for(let i = 0; i < DeckCardSet.SkipCards; i++){
				let card = new SkipCards("Skip", color);
				this.deck.Insert(card);
			}
			
			for(let i = 0; i < DeckCardSet.ReverseCards; i++){
				let card = new ReverseCards("Reverse", color);
				this.deck.Insert(card);
			}

			for(let i = 0; i < DeckCardSet.Draw2Cards; i++){
				let card = new Draw2Cards("Draw 2", color);
				this.deck.Insert(card);
			}
		});
	
		for(let i = 0; i < DeckCardSet.Draw4Cards; i++){
			let card = new Draw4Cards("Draw 4");
			this.deck.Insert(card);
		}

		for(let i = 0; i < DeckCardSet.SwitchColor; i++){
			let card = new SwitchColorCards("Shuffle");
			this.deck.Insert(card);
		}

		for(let i = 0; i < DeckCardSet.Shuffle; i++){

			let card = new ShuffleCards("Shuffle");
			this.deck.Insert(card);
		}

		// g_log('DEBUG', 'GAME_DECK', `This is the deck for game_id:${this.id}`);
		// console.log(this.deck);
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

	distributeCards(amount){
		//check if amount * players are not greater than the deck size
		let totalCardNeed = amount * this.players.length;
		if(totalCardNeed >= this.deck.cards.size){
			g_log('ERROR', 'GAME', `Cannot distribute cards because of the amount of distribution. ${totalCardNeed}`)
			return false;
		}

		for(let i = 0; i < amount; i++){
			this.players.forEach((player)=>{
				g_log('DEBUG', 'GAME_CARD_DIST', `Giving ${1} card to ${player.id}`)
				this.drawCard(player.id, 1);
			});
		}
	}

	drawCard(player_id, amount){
		let player_index = this.getPlayerIndexWithId(player_id);
		
		for(let i = 0; i < amount; i++){
			this.players[player_index].hand.push(this.deck.Draw());
		}
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
	
	getClientGameState(game_id, player_id){
		let gameIndex = this.getGameIndexWithId(game_id);
		return this.games[gameIndex].getPlayerGameState(player_id);
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