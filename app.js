
/* dependencies */

const path = require("path");                           // access paths
const express = require("express");                     // express
const MongoClient = require('mongodb').MongoClient;     // talk to mongo
const bodyParser = require('body-parser');              // parse request body
var session = require('express-session');               // create sessions
const MongoStore = require('connect-mongo')(session);   // store sessions in Mongo so we don't get dropped on every server restart

const app = express();
const http = require("http").Server(app);
var io  = require('socket.io')(http);

app.io = io;            // this allows us to emit events on route, I think


const GameActions  = require('./game.js');
var game = null;

var userCount = 0;

app.set("port", $PORT || 3000)                       // we're gonna start a server on whatever the environment port is or on 3000
app.set("views", path.join(__dirname, "/public/views"));        // tells us where our views are
app.set("view engine", "ejs");                                  // tells us what view engine to use

app.use(express.static('public'));                              // sets the correct directory for static files we're going to serve - I believe this whole folder is sent to the user

if($LIVE){                                                                           // this is how I do config, folks. put away your pitforks, we're all learning here.
    dbAddress = $ATLAS_STRING;
} else {
    dbAddress = "mongodb://localhost:27017/wordsync";
}

MongoClient.connect(dbAddress, function(err, database){
    if (err){
        console.log("MAYDAY! MAYDAY! Crashing.");
        return console.log(err);
    } else {


        db = database.db("wordsync");       // fix for Mongo 3.0.0
                                            // alternativey, use "mongodb": "^2.2.33" in package.JSON


        app.use(bodyParser.urlencoded({
            extended: true
        }));

        app.use(bodyParser.json());                         // for parsing application/json

        var thisDb = db;

        var sessionSecret = $SESSION_SECRET || "ejqjxvsh994hw8e7fl4gbnslvt3";

        var sessionMiddleware = session({
            secret: sessionSecret,
            saveUninitialized: true,
            resave: false,
            secure: false,
            expires: null,
            cookie: {
                maxAge: null
            },/*
            store: new MongoStore({ 
                db: thisDb,
                ttl: 60*60*12,                  // in seconds - so, 12 hours total. Ths should hopefully expire and remove sessions for users that haven't logged in
                autoRemove: 'native'
            })*/
        })



        app.use(sessionMiddleware);         // give app access to the session

        io.use(function(socket, next) {     // give socket.io access to the session
            sessionMiddleware(socket.request, socket.request.res, next);
        });

        app.use(function(req, res, next){                                           // logs request URL
            
            var timeNow = new Date();
            console.log("-----> " + req.method.toUpperCase() + " " + req.url + " on " + timeNow); 

            next();
        });


        /* ROUTES */

        io.on('connection', function(socket){

            console.log('a user connected');
            userCount++;
            console.log("User count is now: " + userCount);

            console.log("socket.request.session.id");
            console.log(socket.request.session.id);

            socket.emit("update id", socket.request.session.id);
            
            socket.on('disconnect', function(){
                console.log('user disconnected');
                userCount--;
                console.log("User count is now: " + userCount);
            });


            socket.on("new game", function(){
                var playerId = socket.request.session.id;          // how we access the session from Socket.io NOTE: can't write!
                GameActions.createGame(db, playerId, function(result){
                    
                    if(result.status == "success") { 
                        game = result.game 
                    }
                    
                    socket.emit("game created", result);
                });

            });


            socket.on("join game", function(gameId){
                    var playerId = socket.request.session.id;          
                    GameActions.joinGame(db, playerId, gameId, function(result){
                        
                        if(result.status == "success"){
                            game = result.game;
                            io.emit("game joined", result);
                        } else {
                            socket.emit("game joined", result);
                        }
                });

            });

            socket.on("submit guess", function(word){
                console.log("incoming guess");
                word = word.trim().toLowerCase();
                var playerId = socket.request.session.id;          
                GameActions.submitGuess(db, playerId, game.id, word, function(result){
                    if(result.status == "success"){
                        result.game.player1.currentWord = null;
                        result.game.player2.currentWord = null;
                        io.emit("guess submitted", result);
                    } else {
                        socket.emit("guess submitted", result);
                    }                    
                });

            });


            socket.on("get updated game", function(){
                var playerId = socket.request.session.id;   
                GameActions.loadGame(db, playerId, game.id, function(result){
                    socket.emit("game updated", result)
                });
            });


        });
            

        app.get("/", function(req, res){
            console.log("req.session.id");
            console.log(req.session.id);
            res.render("start", {error: ""});   
        })

        app.get("/game", function(req, res){

            if(game == null){ 
                game = {id: 12345 };            // 5 digit ID ensures the game will never be found
            }

            GameActions.loadGame(db, req.session.id, game.id, function(result){

                if(result.status == "success"){
                    res.render("game", {error: "", gameId: game.id});
                } else {
                    res.redirect("/");   
                }

            });
            
        })


        app.get("/aww", function(req, res){
            res.render("loss");   
        })


        /* END ROUTES */


        /* 404 */

        app.use(function(req, res) {
            res.status(404);
            req.session.error = "404 - page not found!";
            res.redirect("/");
        });

        http.listen(app.get("port"), function() {
            console.log("Server started on port " + app.get("port"));
        });
}});
