var fs = require('fs');
//Store the game data incl players,currRoundNum,currRoundAns
var dataStore = {
};
//Map of user sockedId vs gameId
var socketGameMap = {
};

var io;
//Dataset for fetching anagrams
var words = fs.readFileSync('words_new.txt').toString().split("\n");
var exhaustedWords = fs.readFileSync('exhausted_words.txt').toString().split("\n");
console.log("Count of exhausted words is "+exhaustedWords.length);

console.log("words_original count is "+words.length);


words = words.filter(function(x) {
  return exhaustedWords.indexOf(x) < 0;
});

console.log("words_min_exh count is "+words.length);

var wordsIndex={};
for(var wi=0;wi<words.length;wi++){
  var firstChar = words[wi].charAt(0);
  if( wordsIndex[firstChar] === undefined){
      wordsIndex[firstChar] = [];
  }
  wordsIndex[firstChar].push(words[wi]);
}



var currSecKey = 0;
var currSecArr = [0,3,2,5,1,4]; //1 4 3 6 2 5
var currSecChar = '';


//Shuffle the letters of a string
String.prototype.shuffle = function () {
    var a = this.split(""),
        n = a.length;
    console.log(a);
    for(var i = n - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = a[i];
        a[i] = a[j];
        a[j] = tmp;
    }  
  
    return a.join("");

  
    /*
    currSecKey=currSecKey%6;
    console.log("SecVal is "+(currSecArr[currSecKey]+1));

  
    if(this.charAt(0) !== a[currSecArr[currSecKey]]){
      //console.log(a);
      var tmp = this.charAt(0);
      a[a.indexOf(this.charAt(0))] = a[currSecArr[currSecKey]];
      a[currSecArr[currSecKey]] = tmp;
    }
    console.log(a+" & CURRSECKEY is "+currSecKey);
     console.log(this);
      currSecKey++;

     return a.join("");
     */
    
  
}

exports.initGame = function(_io,socket){
  
  io = _io;
  
  
  //Host properties
  socket.on("createNewGame",createNewGame);
  socket.on("hostStartGame",startGame);

  //Player properties
  socket.on("getCreatedGames",getCreatedGames);
  socket.on("joinGame",joinGame);
  
  //Common for host & players
  socket.on("submitAnswer",submitAnswer);  
  socket.on('disconnect', playerDisconnect);


}

//When a player exists the game / WS gets disconnected
function playerDisconnect(){
  var socketId = this.id;
  console.log("player disconnected with socket "+socketId);

  
  //Player belongs to a running game
  if(socketGameMap.hasOwnProperty(socketId)){
    //console.log(socketGameMap);
    var gameId = socketGameMap[socketId];
    //remove player from the dataStore
    console.log(dataStore[gameId]);
    for(var pc =0; pc < dataStore[gameId].players.length;pc++){
      if(dataStore[gameId].players[pc].socketId == socketId){
        console.log("player is in a game");
        dataStore[gameId].players.splice(pc,1);
        
      }
    }

    //If no other players in the game
    if(dataStore[gameId].players.length == 0){
      //Flush data of the entire game
      delete dataStore[gameId];
    }else{
      //update scores
      io.in(gameId).emit('updateScoreCard',dataStore[gameId].players);
      //If player not yet in a game, update joinedPlayersList
      io.in(gameId).emit('updatePlayersJoined',dataStore[gameId].players);

    }
  }
  
  //Flush socket info of the user
  delete socketGameMap[socketId];
  
}

//Gets all created games which are not started yet
//Used by players trying to find all running games
function getCreatedGames(){
  
  var createdGames = [];
   
  var gameIds = Object.keys(dataStore);
  for(var gc=0;gc < gameIds.length; gc++){
    var gameId = gameIds[gc];
    console.log(dataStore[gameId].players[0]);
    if(!dataStore[gameId].isStarted){
      createdGames.push({
        "gameId" : gameId,
        "hostName" : dataStore[gameId].players[0].id
      }); 
    
    } 
  } 
  //Join all such users into a room.
  this.join("joinGameSeekers");
  this.emit('createdGamesList',createdGames);
 
}

//Called by Host
//Creates a new game but no started yet.
function createNewGame(data){
  //generate random gameId.
  var gameId = parseInt(Math.random()*10000000).toString();
  dataStore[gameId] = {
    "players":[{
      id:data.id,
      score:0,
      socketId:this.id
    }],
    "currRoundAns":"",
    "currRoundNum":0,//only incremented when sending the curr round ans
    "isStarted" : 0,
    "currStepScore":0
  };
  
  console.log("started new game : "+gameId);
  console.log(data);

  this.join(gameId);
  this.emit('newGameCreated',{gameId: gameId, socketId: this.id});
  
  //emit to all waiting players.
  var createdGames = [];
   
  var gameIds = Object.keys(dataStore);
  for(var gc=0;gc < gameIds.length; gc++){
    var gameId = gameIds[gc];
    console.log(dataStore[gameId].players[0]);
    if(!dataStore[gameId].isStarted){
      createdGames.push({
        "gameId" : gameId,
        "hostName" : dataStore[gameId].players[0].id
      });
      socketGameMap[this.id] = gameId;   
    } 
  } 
  io.in("joinGameSeekers").emit('createdGamesList',createdGames);
  
}

//Called by Host.
function startGame(data){  
  console.log("start game called");
  console.log(data);
  dataStore[data.gameId].isStarted = 1;
  //Start game 
  io.in(data.gameId).emit("startGame",data);
  //Update scorecard
  io.in(data.gameId).emit('updateScoreCard',dataStore[data.gameId].players);
  //Send the first question after 2s
  setTimeout(function(){
    sendNextAnagram(data.gameId);
  },2000);
}

//Called by Players.
function joinGame(data){
  console.log("called join game");  
  dataStore[data.gameId].players.push({
    id:data.id,
    score:0,
    socketId:this.id
  });
  socketGameMap[this.id] = data.gameId;
  
  this.join(data.gameId);
  console.log(data.gameId);
  
  //Update host waiting for players to join.
  io.in(data.gameId).emit('updatePlayersJoined',dataStore[data.gameId].players);
  
}

//Called when an answer is typed.
function submitAnswer(data){
  //check if answer is correct
  //Broadcast the answer to all sockets
  this.in(data.gameId).emit('newAnagram',data.id+": "+data.answer);
  console.log("answer received");
  console.log(data);
  console.log(dataStore[data.gameId].currRoundAns);
  if( dataStore[data.gameId].currRoundAns == data.answer){
    //populate scores
    updatePlayerScore(data.gameId,data.id);
    //Update roundNum
    dataStore[data.gameId].currRoundNum++;
    //Announce this round winner
    var winner_name = data.id;
    /*if(data.id.match(/mall|arjun/)){
      winner_name = "My MASTER "
    }
    */
    io.in(data.gameId).emit('newAnagram',normaliseChatLog("Bot", winner_name+' has won this round. The answer is '+dataStore[data.gameId].currRoundAns),{"color":"#0d426c"}); 
    //Update the scores
    io.in(data.gameId).emit('updateScoreCard',dataStore[data.gameId].players);   
    //Check for winners
    var winners = checkForWinner(data.gameId);
    if(winners.length > 0){
      io.in(data.gameId).emit('announceWinner',winners.join(' & ')+" Wins");
      //Game has ended.Delete game.
      delete dataStore[data.gameId];
      //startGame(data);
      
    }else{
      //Send next anagram
      //setTimeout(function(){
        sendNextAnagram(data.gameId);
      //},100);
    }
  }  
  
}

function normaliseChatLog(sender,message,markup){
  if( markup !== undefined ){
    markup = true;
    
    var displayMessage = "";
    for(var i=0;i<2*message.length;i++){
      if(i%2==0){
        displayMessage += message.charAt(i/2);
      }else{
        displayMessage += " ";
      }
      
    }
    //console.log("entering here "+displayMessage);
    
    
  }else{
    markup = false;
    displayMessage = message;
  }
  return sender+": "+displayMessage;
}

function sendNextAnagram(gameId){
  
  
  io.in(gameId).emit('newAnagram',createNextAnagramSentence(gameId),{"color":"#0d426c"});  
  //dataStore[gameId].currRoundNum++;
  dataStore[gameId].currStepScore = 3;
  
  var currRoundNum = dataStore[gameId].currRoundNum;
  setTimeout(function(){
    
    //2nd step of answer
    if( dataStore.hasOwnProperty(gameId) && currRoundNum == dataStore[gameId].currRoundNum){
      
      dataStore[gameId].currStepScore = 2;
      sendRefreshedAnagram(gameId);
      
      //3rd answer step
      setTimeout(function(){
        if( dataStore.hasOwnProperty(gameId) && currRoundNum == dataStore[gameId].currRoundNum){

          dataStore[gameId].currStepScore = 1;
          sendRefreshedAnagram(gameId);
      
          setTimeout(function(){

            if(dataStore.hasOwnProperty(gameId) && currRoundNum == dataStore[gameId].currRoundNum){
              io.in(gameId).emit('newAnagram',normaliseChatLog("Bot","No one got the correct answer. The answer is "+dataStore[gameId].currRoundAns+". Moving to the next word"),{"color":"#0d426c"});  
              //Change the current game answer
              //dataStore[gameId].currRoundAns = "randmallikstr";
              setTimeout(function(){
                sendNextAnagram(gameId);
              },10);
            }
          },5000);//3rd step wait //5
        }
      },10000);//2nd step wait //10
    }
  },8000);//1st step wait //7
  
}

//Updates player scores and sends to all sockets in the gameId room.
function updatePlayerScore(gameId,playerId){
  for(var pc=0;pc < dataStore[gameId].players.length;pc++){
    if(dataStore[gameId]['players'][pc]['id'] == playerId){
      dataStore[gameId]['players'][pc]['score']+= dataStore[gameId]['currStepScore'];       
    }    
  }  
}

function checkForWinner(gameId){
  var winners = [];
  for(var pc=0;pc < dataStore[gameId].players.length;pc++){
    if(dataStore[gameId]['players'][pc]['score'] > 30){
      winners.push(dataStore[gameId]['players'][pc]['id']);      
    }
  }
  return winners;

  
}

//Creates the sentence to be shown in chat for the next anagram.
function createNextAnagramSentence(gameId){
  
  if(currSecChar == ''){
    var wordIndex = Math.floor(Math.random() * words.length);
    var actualWord = words[wordIndex];
  }else{
    while(wordsIndex[currSecChar] == undefined || wordsIndex[currSecChar].length == 0 ){
      console.log("CurrSecChar is "+currSecChar);
      var asciiCode = currSecChar.charCodeAt(0);
      asciiCode++;
      if(asciiCode > 122){
        asciiCode = 97 + asciiCode - 122;
      
      }
      
      currSecChar = String.fromCharCode(asciiCode);
      console.log("FinalSecChar is "+currSecChar);
    
    }
    //currSecChar = a[a.length - 2];
    var currDataSet = wordsIndex[currSecChar];
    var wordIndex = Math.floor(Math.random() * currDataSet.length);
    var actualWord = currDataSet[wordIndex];
    
    wordsIndex[currSecChar].splice(wordIndex,1);

    
    
    
  }
  
  //console.log(wordsIndex[currSecChar]);
  //console.log("actualWord is "+actualWord);
  //console.log("currSecChar is "+currSecChar);
  currSecChar = actualWord.charAt(actualWord.length - 4);

  var anagram = actualWord.shuffle();
  dataStore[gameId].currRoundAns = actualWord;
  
  //Log actual word to exhausted words
  fs.appendFile('exhausted_words.txt', actualWord+"\n", function(err) {
    		if(err) {
        		return console.log(err);
    		}

	});


  
  
  return normaliseChatLog("Bot",anagram,true);
}

//Refreshes the current anagram
function refreshAnagramSentence(gameId){
  var currRoundAns = dataStore[gameId].currRoundAns;
  //var anagram = dataStore[gameId].currRoundAns.shuffle();
  var ans_length = currRoundAns.length;
  
  var rand_num_arr = [];
  
  var currStepScore  = dataStore[gameId].currStepScore;
  var maskCharCount = 0;
  if( currStepScore == 2){
    maskCharCount = ans_length/2 + 1;
  
  }else if( currStepScore == 1){
    maskCharCount = ans_length/2;
           
  }else{
    maskCharCount = ans_length/2        
  }
  
  while(rand_num_arr.length <= maskCharCount ){
  
    var rand_num = Math.floor(Math.random() * ans_length);
    if(rand_num_arr.indexOf(rand_num) != -1) {
      //console.log("entering this mess");
      continue;
    }
    rand_num_arr.push(rand_num);
  
  }
  console.log(rand_num_arr);
  
  for(var w=0;w<ans_length;w++){
    if(rand_num_arr.indexOf(w) !== -1){
      currRoundAns = currRoundAns.replaceAt(w,'*');
    }
  }
  console.log("Replaced ans is "+currRoundAns);

  
  return normaliseChatLog("Bot",currRoundAns,true);
}

String.prototype.replaceAt=function(index, replacement) {
    return this.substr(0, index) + replacement+ this.substr(index + replacement.length);
}

//send the refreshed anagram of the current round
function sendRefreshedAnagram(gameId){
    io.in(gameId).emit('newAnagram',refreshAnagramSentence(gameId),{"color":"#0d426c"});  
}

