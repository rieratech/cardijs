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
        this.noneStarters = ["A", "2", "3", "J" , "Q", "K"],
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
            if(!this.isInGroup(this.noneStarters, this.deck[randomPosition].rank)) cardMatched = true;
        }
        this.table.push(this.deck[randomPosition]);
        this.deck.splice(this.deck[randomPosition], 1);
        return this;
    }
    match(attempt, liveCard, continuousPlay = false){
        if(liveCard.rank === "X"){
            return attempt.suit === liveCard.suit
        };
        if(attempt.rank === liveCard.rank) return true;
        if(this.isInGroup(this.questionRanks, liveCard.rank)){
            return ((attempt.suit === liveCard.suit) && !this.isInGroup(this.noneAnswers, attempt.rank));
        }
        if(continuousPlay) return false;
        if(this.isInGroup(this.punisherRanks, liveCard.rank)){
            return this.isInGroup(this.masterRanks, attempt.rank);
        }
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
        this.currentPLayer = {
            index : 0,
            picks : 1,
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
        this.currentPLayer.index = 0;
        this.live = true;
        return this;
    }
    sendMessage(message){
        //to
        //card matched
        //points earned
        //continuous play reward
    };
    goToNext(){
        while(this.currentPLayer.picks > 0){
            this.issueCardToPlayer(this.players[this.currentPLayer.index])
            console.log("issue" + this.currentPLayer.picks);
            this.currentPLayer.picks--;
        }
        let nextPLayerIndex = (this.currentPLayer.index + this.route) + (this.skip * this.route);
        while(nextPLayerIndex > this.players.length - 1){
            nextPLayerIndex -= this.players.length;
        }
        while(nextPLayerIndex < 0){
            nextPLayerIndex += this.players.length;
        }
        this.skip = 0;
        this.round += 1;
        this.currentPLayer.playRound = 0;
        this.currentPLayer.picks = 1;
        this.currentPLayer.isMaster = false;
        this.currentPLayer.index = nextPLayerIndex;
        return nextPLayerIndex;
    }
    canPlay(playerId){
        return this.live && (playerId === this.players[this.currentPLayer.index]);
    }
    callCardi(playerId){
        if(!this.canPlay(playerId)) return this;
        this.players[this.currentPLayer.index].isCardi = true;
        this.goToNext();
        return this;
    }
    mastersRequest(playerId, attempt){
        if(!this.canPlay(playerId)) return this;
        if(!this.currentPLayer.isMaster) return this;
        this.requestedSuit = attempt.suit;
        this.goToNext();
        return this;
    }
    setPLay(attempt, liveCard){
        this.players[this.currentPLayer.index].isCardi = false;
        this.currentPLayer.picks = 0;
        this.currentPLayer.playRound += 1;
        this.requestedSuit = "";
        if(!this.cards.isInGroup(this.cards.noneStarters, attempt.rank) && this.players[this.currentPLayer.index].cards.length < 1 && this.players[this.currentPLayer.index].isCardi){
            return 100;
        }
        if(this.cards.isInGroup(this.cards.masterRanks, attempt.rank)){
            if (this.cards.isInGroup(this.cards.punisherRanks, liveCard.rank)){
                return 7;
            }
            this.currentPLayer.isMaster = true;
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
            this.currentPLayer.picks = 1;
            return 10;
        }
        if(this.cards.isInGroup(this.cards.punisherRanks, attempt.rank)){
            this.currentPLayer.picks += parseInt(attempt.rank);
            return 3;
        }
        return 7;
    }
    play(playerId, attempt){
        if(!this.canPlay(playerId)) return this;

        let liveCard = this.cards.table[this.cards.table.length - 1];
        let continuousPlay = this.currentPLayer.playRound > 0;
        let continuousPlayReward = this.currentPLayer.playRound * 2;

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
        let attemptCard = this.players[this.currentPLayer.index].cards[attempt.index];
        if(!this.cards.match(attemptCard, liveCard, continuousPlay)) {
            return this
        };
        let reward = this.setPLay(attemptCard, liveCard);
        this.acceptCardFromPlayer(this.players[this.currentPLayer.index], attempt.index);
        this.players[this.currentPLayer.index].points += (reward + continuousPlayReward);
        if(reward === 100){
            this.live = false;
            return this;
        }
        return this;
    }
}