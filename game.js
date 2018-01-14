const database = require("./database");

function createGame(db, playerId, done){

    var newGame = {
        id: generateId(4),
        startTime: Date.now(),
        status: "setup",
        player1: {
            id: playerId,
            currentWord: null,
            history: []
        },
        player2: {
            id: null,
            currentWord: null,
            history: []
        },
    }

    database.create(db, "games", newGame, function(games){

        console.log("games.ops[0]");
        console.log(games.ops[0]);

        var result;

        if(games.ops.length == 1){
            result = {
                status: "success", 
                game: games.ops[0]
            }
        } else {
            result = {
                status: "error", 
                error: "Unable to create game"
            }
        }

        done(result);
        
    });
}


function joinGame(db, playerId, gameId, done){

    var gameQuery = {
        id: gameId
    }

    database.read(db, "games", gameQuery, function(games){

        console.log("games");
        console.log(games);

        if(games.length == 1){
            console.log("game found");
            var game = games[0];

            if(playerId == game.player1.id || playerId == game.player2.id){
                done({
                    status: "success",
                    game: games[0]
                })
            } else if(game.player2.id == null || game.player2.id == "null"){
                if(game.player1.id != playerId){
                    var gameUpdate = {
                        $set: {
                            status: "in progress"
                        }
                    }

                    gameUpdate.$set["player2.id"] = playerId;

                    database.update(db, "games", gameQuery, gameUpdate, function(updatedGame){
                        done({
                            status: "success",
                            game: updatedGame
                        })
                    })
                } else { 
                    console.log("You're already in this game. Invite a friend!");
                    done({
                        status: "error",
                        error: "You're already in this game. Invite a friend!"
                    })
                }

            } else { 
                console.log("This game is already in progress");
                done({
                    status: "error",
                    error: "This game is already in progress"
                })
            }
        } else {
            console.log("This game does not exist");
            done({
                status: "error",
                error: "This game does not exist"
            })
        }

    });


}

function loadGame(db, playerId, gameId, done){

    var gameQuery = {
        id: gameId
    }

    database.read(db, "games", gameQuery, function(games){

        if(games.length == 1){
            console.log("game found");
            var game = games[0];

            console.log(playerId);


            if(game.player1.id == playerId || game.player2.id == playerId){

                if(game.status == "in progress"){

                    var thisPlayer = "player1";
                    var otherPlayer = "player2";

                    if(game.player2.id == playerId){
                        thisPlayer = "player2";
                        otherPlayer = "player1";
                    }

                    console.log("this player: " + thisPlayer);
                    console.log("other player: " + otherPlayer);

                    done({
                        status: "success",
                        game: games[0],
                        thisPlayer: game[thisPlayer],
                        otherPlayer: game[otherPlayer]
                    })

                } else {
                    done({
                        status: "error",
                        error: "This game is over"
                    })
                }


            } else {
                done({
                    status: "error",
                    error: "You are not in this game"
                })
            }
        } else {
            done({
                status: "error",
                error: "This game does not exist"
            })
        }
    });
}

function submitGuess(db, playerId, gameId, word, done){

    var gameQuery = {
        id: gameId
    }

    database.read(db, "games", gameQuery, function(games){

        if(games.length == 1){

            var game = games[0];

                if(game.player1.id == playerId || game.player2.id == playerId){

                    console.log("game found");
                    word = word.trim().toLowerCase();

                    var thisPlayer = "player1";
                    var otherPlayer = "player2";

                    if(game.player2.id == playerId){
                        thisPlayer = "player2";
                        otherPlayer = "player1";
                    }

                    console.log("this player: " + thisPlayer);
                    console.log("other player: " + otherPlayer);

                    var gameUpdate = {
                        $set: {}
                    }


                    if(game[otherPlayer].currentWord == null || game[otherPlayer].currentWord == "null"){

                        // if the other player hasn't submitted his word yet...
                        console.log("still waiting for the other player to submit word");
                        if(game[thisPlayer].currentWord == null || game[thisPlayer].currentWord == "null"){
                            gameUpdate.$set[thisPlayer + ".currentWord"] = word;
                        } else {
                            done({
                                status: "error",
                                error: "You already submitted a guess: " + game[thisPlayer].currentWord
                            })
                        }
                        

                    } else {

                        console.log("other player already submitted word");

                        // if the other player has submitted a word...

                        /*

                            in any case:

                            1. move the incoming word straight to history (no need to set as current word)
                            2. push the other player's current word to history
                            3. set the other player's current word to 'null' (this player's current word is already null)
                            4. compare the words, and set the status to either Victory or In Progress
                        */

                        gameUpdate.$push = {};

                        gameUpdate.$push[thisPlayer + ".history"] = word;
                        gameUpdate.$push[otherPlayer + ".history"] = game[otherPlayer].currentWord;
                        gameUpdate.$set[otherPlayer + ".currentWord"] = null;   // need to set null AFTER pushing to history array
                        
                        if(game[otherPlayer].currentWord == word){
                            // if the words equal, VICTORY!!
                            // you win, I win, EVERYBODY GETS A WIN!
                            console.log("VICTORY!");
                            gameUpdate.$set.status = "won";  
                        } else {
                            console.log("not quite, but let's keep trying");
                        }


                    }

                    console.log("sending this game update:");
                    console.log(gameUpdate);
                    console.log("----------");

                    database.update(db, "games", gameQuery, gameUpdate, function(updatedGame){

                        var p1status = false,
                            p2status = false;

                        if(updatedGame.player1.currentWord != null && updatedGame.player1.currentWord != "null" ) { p1status = true}
                        if(updatedGame.player2.currentWord != null && updatedGame.player2.currentWord != "null" ) { p2status = true}

                        done({
                            status: "success",
                            player1done: p1status,
                            player2done: p2status,
                            game: updatedGame
                        })
                    });

                } else {
                    done({
                        status: "error",
                        error: "You are not in this game"
                    })
                }

            } else {
            done({
                status: "error",
                error: "This game does not exist"
            })
        }
    });




}


function generateId(length){
    var chars = "abcdefghijklmnopqrstuvwxyz1234567890"
    var gameId = "";

    for (var i = 0; i < length ; i++){
        gameId += chars[Math.floor(Math.random()*chars.length)]
    }

    return gameId;
}

module.exports.createGame = createGame;
module.exports.joinGame = joinGame;
module.exports.loadGame = loadGame;
module.exports.submitGuess = submitGuess;