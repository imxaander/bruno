
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
	id;
	name;
	hand = []; //array of cards
	isTurn; //bool

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

	constructor(host, name){
		this.host = host; //player_id
		this.name = name; //name of game/room
		this.id = Math.floor((Math.random() * 999) + 1); 

		this.is_prepping = true;
		this.is_ongoing = false;
		this.is_concluding = false;
		this.players = []; //player array
		this.currentPlayer; //index of the current player
	}
	
	start(){};
	stop(){};
	addPlayer(player_id){};
	//TODO: deleteplayer

	nextTurn(player_index){};
	loop(){

	}

	actions = {

		TurnNumberCard : (args) => {
			// args
		}, 

	}

	getPlayerIndexWithId(player_id){
		return players.findIndex(player => player.id === player_id);
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
	games = [];

	newGame(host_player_id){
		games.push(new Game())
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
    BrunoSystem
}