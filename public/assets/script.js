var socket = io();
var gameId = null;      // this is an awful practice, until I think of something better



$(document).ready(function(){

    $("body").on("click", "#new-game", function(){
        socket.emit("new game");
    });

    $("body").on("click", "#join-game", function(){
        var gameId = $("#game-code").val().trim().toLowerCase();
        socket.emit("join game", gameId);
    });


    $("body").on("click", "#submit-guess", function(){
        var word = $("#next-guess").val().trim().toLowerCase();
        console.log(word);
        if(word.length){
            hideInput();
            socket.emit("submit guess", word);
            $("#next-guess").val("");
        } else {
            $("#game-error").addClass("active-error").text("You forgot to enter a word!");
        }
        
    });

    $("body").on("keydown", "#next-guess", function(){
        $("#game-error").text("").removeClass("active-error");
    });

    $("body").on("keydown", "#game-code", function(){
        $("#game-error, #start-error").text("").removeClass("active-error");
    });

    if(window.location.pathname == "/game"){
        socket.emit("get updated game");
    }


    /* SOCKET LISTENERS */


    socket.on("update id", function(id){
        console.log(id);
        gameId = id;
    });

    socket.on("game created", function(result){
        console.log(result);
        if(result.status == "success"){
            $("#new-game-section").empty().append("<span>Created game <span class = 'bold'>" + result.game.id + "</span></span><br><span id ='waiting-status'>Waiting for second player to join</span>").css("font-size", "2rem");
        } else if(result.status == "error"){
            $("#start-error").addClass("active-error").text(result.error);
        }
    })

    socket.on("game joined", function(result){
        console.log(result);
        if(result.status == "success"){
            window.location.href = "/game";
        } else if(result.status == "error"){
            $("#start-error").addClass("active-error").text(result.error);
        }
    });


    socket.on("guess submitted", function(result){

        $("#game-error").text("").removeClass("active-error");

        if(result.status == "success"){
            game = result.game;
            console.log(game.status);

            if(game.status == "in progress"){
                updateGame(result);
            } else if(game.status == "won"){
                console.log("VICTORY!");

                $("#input-section").empty().append("<div id = 'victory-message'>YOU WIN!</div>");
                $("#input-section").append("<a href = '/'><button id = 'play-again'>Play Again</button></a>");
                updateGame(result);

            } 

        } else {
            $("#game-error").addClass("active-error").text(result.error);
        }
    })

    socket.on("game updated", function(result){
        console.log("updating game!");
        if(result.status == "success"){
            console.log(result.game);
            updateGame(result);
        } else {
            window.location.href = "/";
        }
        
    });



    function updateGame(result){


        game = result.game;
        // update the game view

        console.log(result);

        var thisPlayer = "player1",
            otherPlayer = "player2";

        if(game.player2 && game.player2.id == gameId){
            thisPlayer = "player2";
            otherPlayer = "player1";
        }   

        console.log("this is " + thisPlayer);

        var yourLastWord = "",
            theirLastWord = "";

        if(game[thisPlayer].history.length){ 
            var lastPosition = game[thisPlayer].history.length - 1;
            yourLastWord = game[thisPlayer].history[lastPosition];
            $("#round-count").text(game[thisPlayer].history.length + 1);
        
        }
        
        if(game[otherPlayer].history.length){ 
            var lastPosition = game[otherPlayer].history.length - 1;
            theirLastWord = game[otherPlayer].history[lastPosition]; 
        }

        $("#your-word").text(yourLastWord);
        $("#their-word").text(theirLastWord);

        /* fill out history */

        $("#guess-history").empty();

        if(game[thisPlayer].history.length == game[otherPlayer].history.length){
            console.log("printing history");

            for(var i = game[thisPlayer].history.length - 1; i >= 0; i--){
                var yourHistoryWord = game[thisPlayer].history[i];
                var theirHistoryWord = game[otherPlayer].history[i];

                console.log(yourHistoryWord);
                console.log(theirHistoryWord);
                $("#guess-history").append("<div class = 'row'><div class = 'six columns left'>" + yourHistoryWord + "</div><div class = 'six columns right'>" + theirHistoryWord + "</div><div>");
            }
        } else {
            $("#game-error").text("Unable to display guess history").addClass("active-error");
        }

/*        if(result.player1done && thisPlayer == "player1"){
            hideInput();
        } else if(result.player1done && thisPlayer == "player2"){
            hideInput();
        } else {
            showInput();
        }*/


        $("#your-word").text(yourLastWord);
        $("#their-word").text(theirLastWord);
        $("#input-wrapper").show();
        $("#guess-waiting-status").hide();

    }


    function hideInput(){
        console.log("guess made");
        $("#input-wrapper").hide();
        $("#guess-waiting-status").text("Waiting for the other player...").show();
    }

    function showInput(){
        $("#guess-waiting-status").hide();
        $("#input-wrapper").show();
    }



});



