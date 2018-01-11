var socket = io();




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
            socket.emit("submit guess", word);
            $("#next-guess").val("");
        } else {
            $("#game-error").text("You forgot to enter a word!");
        }
        
    });


    /* SOCKET LISTENERS */

    socket.on("game created", function(result){
        console.log(result);
        if(result.status == "success"){
            $("#new-game").after("<p>Created game <span class = 'bold'>" + result.game.id + "</span></p>");
            $("#new-game").after("<p id ='waiting-status'>Waiting...</p>");
            $("#new-game").hide();
            $("#start-error").text("");
        } else if(result.status == "error"){
            $("#start-error").text(result.error);
        }
    })

    socket.on("game joined", function(result){
        console.log(result);
        if(result.status == "success"){
            window.location.href = "/game";
        } else if(result.status == "error"){
            $("#start-error").text(result.error);
        }
    });


    socket.on("guess submitted", function(result){
        console.log(result);
        if(result.status == "in progress" || result.status == "waiting "){
            updateGame(result);
        } else if(result.status == "won"){
            console.log("VICTORY!");
            window.location.href = "/victory";
        } else {
            $("#game-error").text(result.error);
        }
    })


    function updateGame(game){
        // update the game view

        console.log("updating game");

        var yourWord = game.thisPlayer.currentWord;
        var theirWord = game.otherPlayer.currentWord;

        if(yourWord == null || yourWord == "null") { yourWord = "waiting..." }
        if(theirWord == null || theirWord == "null") { theirWord = "waiting..." }


        $("#your-word").text(yourWord);
        $("#their-word").text(theirWord);

        /* fill out history */

        game.thisPlayer.history.forEach(function(word){
            $("#your-history").append("<p>" + word + "<p>");
        });

        game.otherPlayer.history.forEach(function(word){
            $("#their-history").append("<p>" + word + "<p>");
        });

    }


});



