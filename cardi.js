class Player{
    constructor(id, game, cards = [], isCardi =false, points = 0){
        this.id = id,
        this.game = game,
        this.cards = cards,
        this.isCardi = isCardi,
        this.points = points
    }
}
class Cards{
    constructor(){
        this.ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"],
        this.suits = ["DIA", "FLW", "HRT", "SPD"],
        this.noneStarters = ["A", "2", "3", "8", "J" , "Q", "K"],
        this.questionRanks = ["8", "Q"],
        this.noneAnswers = ["2", "3", "J", "K"],
        this.punisherRanks = ["2", "3"],
        this.masterRanks = ["A"],
        this.skippingRanks = ["J"],
        this.routingRanks = ["K"],
        this.deck = [],
        this.table = []
    }
    generate(){
        this.ranks.forEach(rank => this.suits.forEach(suit => this.deck.push({rank: rank, suit: suit})));
        return this;
    }
    shuffle(){
        if(this.deck.length < 2) return;
        for(let i = 0; i < this.deck.length; i++){
            let randomPosition = Math.floor(Math.random() * (this.deck.length - 1));
            let randomCard = this.deck[randomPosition];
            let currentCard = this.deck[i];
            this.deck[i] = randomCard;
            this.deck[randomPosition] = currentCard;
        }
        return this;
    }
    isInGroup(group, rank){
        return group.some(member => member === rank);
    }
    firstPlay(){
        if(this.deck.length < 52) return;
        let cardMatched = false;
        let randomPosition;
        while(!cardMatched){
            randomPosition = Math.floor(Math.random() * (this.deck.length - 1));
            cardMatched = !this.isInGroup(this.noneStarters, this.deck[randomPosition].rank);
        }
        this.table.push(this.deck[randomPosition]);
        this.deck.splice(randomPosition, 1);
        return this;
    }
    match(attempt, liveCard, continuousPlay = false, punish = false){
        if(liveCard.rank === "X") return attempt.suit === liveCard.suit;
        if(attempt.rank === liveCard.rank) return true;
        if(this.isInGroup(this.questionRanks, liveCard.rank)){
            return ((attempt.suit === liveCard.suit) && !this.isInGroup(this.noneAnswers, attempt.rank));
        }
        if(continuousPlay) return false;
        if(this.isInGroup(this.punisherRanks, liveCard.rank) && this.isInGroup(this.masterRanks, attempt.rank)) return true;
        if(punish) return false;
        return attempt.suit === liveCard.suit;
    }
}
class Game{
    constructor(id, max=4, min=2){
        this.id = id,
        this.max = max,
        this.live = false,
        this.min = min,
        this.players = [],
        this.cards = [],
        this.currentPlayer = {
            index : 0,
            picks : 1,
            isFree: false,
            isMaster: false,
            playRound: 0
        },
        this.skip = 0,
        this.requestedSuit = "",
        this.round = 0,
        this.route = 1
    }
    joinGame(name){
        if(this.players.length > this.max - 1 || this.live) return;
        let playerId = name;
        while(this.players.some(player => player.id == playerId)){
            playerId = name + Math.floor(Math.random() * (this.max * 2));
        }
        this.players.push(new Player(playerId, this.id));
        return playerId;
    }
    getPlayer(playerId){  
        for(let i = 0; i < this.players.length; i++){
            if(this.players[i].id === playerId) return this.players[i];
        }
    }
    issueCardToPlayer(player){
        player.cards.push(this.cards.deck[this.cards.deck.length - 1]);
        this.cards.deck.splice(this.cards.deck.length - 1, 1);
        if(this.cards.deck.length < 1){
            let recycle = this.cards.table.splice(0, this.cards.table.length - 1);
            this.cards.deck = [...recycle];
            this.cards.shuffle();
        }
    }
    acceptCardFromPlayer(player, index){
        this.cards.table.push(player.cards[index]);
        player.cards.splice(index, 1);
    }
    start(){
        if(this.players < this.min) return;
        this.cards = new Cards().generate().shuffle().firstPlay();
        for(let i = 0; i < 4; i++){
            this.players.forEach(player => this.issueCardToPlayer(player))
        }
        this.currentPlayer.index = 0;
        this.live = true;
        return this;
    }
    sendMessage(message){
        //to
        //cardOnTAble
        //cardi
        //masterRequested
        //card matched
        //points earned
        //continuous play reward
    };
    goToNext(){
        if(!this.currentPlayer.isFree){
            while(this.currentPlayer.picks > 0){
                this.issueCardToPlayer(this.players[this.currentPlayer.index]);
                console.log("issue" + this.currentPlayer.picks);
                this.currentPlayer.picks--;
            }
            this.currentPlayer.picks = 1;
        }
        let nextPlayerIndex = (this.currentPlayer.index + this.route) + (this.skip * this.route);
        while(nextPlayerIndex > this.players.length - 1){
            nextPlayerIndex -= this.players.length;
        }
        while(nextPlayerIndex < 0){
            nextPlayerIndex += this.players.length;
        }
        this.skip = 0;
        this.round += 1;
        this.currentPlayer.playRound = 0;
        this.currentPlayer.isMaster = false;
        this.currentPlayer.isFree = false;
        this.currentPlayer.index = nextPlayerIndex;
        return nextPlayerIndex;
    }
    canPlay(playerId){
        return this.live && (playerId === this.players[this.currentPlayer.index].id);
    }
    callCardi(playerId){
        if(!this.canPlay(playerId)) return this;
        this.players[this.currentPlayer.index].isCardi = true;
        this.goToNext();
        return this;
    }
    mastersRequest(playerId, attempt){
        if(!this.canPlay(playerId)) return this;
        if(!this.currentPlayer.isMaster) return this;
        this.requestedSuit = attempt.suit;
        this.goToNext();
        return this;
    }
    setPlay(attempt, liveCard){
        this.players[this.currentPlayer.index].isCardi = false;
        this.currentPlayer.isFree = true;
        this.currentPlayer.playRound += 1;
        this.requestedSuit = "";
        if(!this.cards.isInGroup(this.cards.noneStarters, attempt.rank) && this.players[this.currentPlayer.index].cards.length < 1 && this.players[this.currentPlayer.index].isCardi){
            return 100;
        }
        if(this.cards.isInGroup(this.cards.masterRanks, attempt.rank)){
            if (this.cards.isInGroup(this.cards.punisherRanks, liveCard.rank)){
                this.currentPlayer.picks = 1;
                return 7;
            }
            this.currentPlayer.isMaster = true;
            return 13;
        }
        if(this.cards.isInGroup(this.cards.skippingRanks, attempt.rank)){
            this.skip += 1;
            return 10;
        }
        if(this.cards.isInGroup(this.cards.routingRanks, attempt.rank)){
            this.route *= -1;
            return 10;
        }
        if(this.cards.isInGroup(this.cards.questionRanks, attempt.rank)){
            this.currentPlayer.isFree = false;
            return 10;
        }
        if(this.cards.isInGroup(this.cards.punisherRanks, attempt.rank)){
            this.currentPlayer.picks += parseInt(attempt.rank);
            return 3;
        }
        return 7;
    }
    play(playerId, attempt){
        if(!this.canPlay(playerId)) return this;

        let liveCard = this.cards.table[this.cards.table.length - 1];
        let continuousPlay = this.currentPlayer.playRound > 0;
        let continuousPlayReward = this.currentPlayer.playRound * 2;
        let punish = this.currentPlayer.picks > 1;

        if(this.requestedSuit.length > 0){
            liveCard = {
                rank: "X",
                suit: this.requestedSuit
            };
        }
        if(attempt.goToNext){
            this.goToNext();
            return this;
        }
        let attemptCard = this.players[this.currentPlayer.index].cards[attempt.index];
        if(!this.cards.match(attemptCard, liveCard, continuousPlay, punish)) {
            return this
        };
        let reward = this.setPlay(attemptCard, liveCard);
        this.acceptCardFromPlayer(this.players[this.currentPlayer.index], attempt.index);
        this.players[this.currentPlayer.index].points += (reward + continuousPlayReward);
        if(reward === 100){
            this.live = false;
            return this;
        }
        return this;
    }
}