$(function() {
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page
  var $winnerPage = $('.winner.page'); // Winner results page
  var $winnerPageTitle = $(".winner.page .title"); //winner page title 
  
  var $createGameBtn = $(".createGameBtn"); // Create game btn - used by host
  var $viewGameBtn = $(".viewGameBtn");// View existing games - used by players
  
  var $startGamePage = $(".startGame.page"); // Page showing all players joined
  var $joinGamePage  = $(".joinGame.page"); // Shows all game available to join
  
  var $startGameBtn = $(".startGame.page .startGameBtn");

  
  var $joinedPlayersList = $(".startGame.page .joinedPlayerList");
  
  var $joinGameBtn = $(".joinGameBtn");
  
  var chatHistoryStore = [];
  var chatHistoryIndex = 0;
  var prevChatWord = "";

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  
  var Player = {
    id:'',
    gameId:'',
    isHost:0,
    init:function(){
    },
    setUserName:function(userName){
      this.id = userName;
    },
    
    getAttr:function(){
      return {
        id:this.id,
        gameId:this.gameId
      }
    
    },
    setGameId:function(gameId){
      this.gameId = gameId;
    }
  };
  
  
  var IO = {
    "init":function(){
      IO.socket = io();
      IO.bindEvents();    
    },
    bindEvents : function() {
 
      //Creates new game, called by host
      IO.socket.on('newGameCreated',IO.newGameCreated);
      //Shows all games avail to join
      IO.socket.on('createdGamesList',IO.createdGamesList);
      //Called when new players join a game
      IO.socket.on('newPlayerJoined', IO.newPlayerJoined );
      //WHen a new round of anagram is received
      IO.socket.on('newAnagram',IO.newAnagram);
      //Starts the gameplay on the screen
      IO.socket.on('startGame',IO.startGame);
      //
      IO.socket.on('updatePlayersJoined',IO.updatePlayersJoined);
      
      IO.socket.on('updateScoreCard',IO.updateScoreCard);
      //Announces winner on the screen
      IO.socket.on('announceWinner',IO.announceWinner);

    },
    
    "announceWinner":function(winnerText){
      $winnerPage.show();
      $winnerPageTitle.append(winnerText);     
    },
    
    "newGameCreated":function(data){
      Player.setGameId(data.gameId); 
      $loginPage.fadeOut();
      $startGamePage.show();
      $loginPage.off('click');
    },

    "updatePlayersJoined":function(data){
      console.log("new player added");
      console.log(Player);
      if(Player.isHost){
        //Do this only for host
        console.log("new player joined");
        console.log(data);
        var playerList = "";
        for (var pc = 0;pc < data.length;pc++){
          playerList += '<li id="'+data[pc].id+'">'+data[pc].id+'</li>';
        } 
        $joinedPlayersList.empty();
        $joinedPlayersList.append(playerList);
      }      
      
    },
    "updateScoreCard":function(data){
      console.log("Score card changed");
      var scoreLines = "";
      for (var pc = 0;pc < data.length;pc++){
        scoreLines += "<tr id=\""+data[pc].id+"\"><td>"+data[pc].id+'</td><td class="score">'+data[pc].score+'</td></tr>';
      }    
      $(".scorecard > tbody").empty();
      $(".scorecard > tbody").append(scoreLines);  
    },
    
    "setUserName":function() {
      username = $usernameInput.val().trim();
      console.log("Username set to "+username);
      // Tell the server your username
      //IO.socket.emit('addPlayer', Player.getAttr());
      if( username.match(/bindu|anne|priya|aajn/) && localStorage.isBindu != -1){
        
        localStorage.isBindu = -1;
        
      }
    
      Player.setUserName(username);
      
    },
    
    "sendAnswer":function(){
      
      var answer = $inputMessage.val();
      if(answer.length == 0 ) return;
      
      var displayMessage = "";
      for(var i=0;i<2*answer.length;i++){
        if(i%2==0){
          displayMessage += answer.charAt(i/2);
        }else{
          displayMessage += " ";
        }
      }  
      Message.log(Player.id+" : "+displayMessage);

      // Prevent markup from being injected into the message
      $inputMessage.val('');
      
      //Log into chatHistoryStore
      chatHistoryStore.push(answer);
      console.log(chatHistoryStore);
      
      // tell server to execute 'new message' and send along one parameter
      IO.socket.emit('submitAnswer', {id:Player.id,gameId:Player.gameId,"answer":answer});
    },
    
    "newAnagram":function(sentence,options){
      console.log("New anagram received" + sentence);
      var chatText = sentence;
      Message.log(chatText,options);
    
    },
    
    "startGame":function(){
      console.log("called to start game");
      //In case of host
      $startGamePage.fadeOut();
      //In case of player
      $joinGamePage.fadeOut();

      $chatPage.show();     
    },
    
    "hostStartGame":function(){
      IO.socket.emit('hostStartGame',Player.getAttr());
    },
    
    "createNewGame":function(){
      IO.socket.emit('createNewGame',Player.getAttr());  
    },
    
    "getCreatedGames":function(){
      IO.socket.emit('getCreatedGames',Player.getAttr());      
    },
    
    "createdGamesList":function(createdGames){
      $(".availableGames > tbody").empty();
      for(var gc= 0 ; gc < createdGames.length; gc++){
        var hostName = createdGames[gc].hostName;
  
        var $el = $('<tr data-gameId="'+createdGames[gc].gameId+'" ><td>'+hostName+'\'s Game Room &#8594;</td><td class="joinGameBtn">JOIN</td></tr>');
        $el.on("click",function(e){
          
          var gameId = $(this).data("gameid");
          console.log("Willing to join game "+gameId);
          Player.gameId = gameId;
          IO.joinGame(Player.getAttr());
          $(".availableGames > tbody").empty();
          $(".availableGames > tbody").append("Successfully joined.<br>Waiting for your host to start the game");

    
        });
        
        $(".availableGames > tbody").append($el);
      }
      
    },
    
    "joinGame":function(data){
      IO.socket.emit('joinGame',Player.getAttr());     

      
    }
  }
  
  IO.init();

  


  //Event listeners
  //Login page Btns
  $(".login.page .btn").on("click",function(e){
    
    username = $usernameInput.val().trim();
    
    
    if(username.length == 0){
      alert("Enter a nick");
      return;
    }

   
    
    IO.setUserName();

    //Create New game
    if( $(this).hasClass("createGameBtn") ){
      Player.isHost = 1;
      //create a new game
      IO.createNewGame();
      
    }else if( $(this).hasClass("viewGameBtn") ){
      //View running games
      Player.isHost = 0;
      
      $loginPage.fadeOut();
      $joinGamePage.show();
      $loginPage.off('click');

      //Get all games available to join
      IO.getCreatedGames();
      
             
    }
    
  });

  
  //When enter is hit on chatbox
  $window.keydown(function (event) {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }

    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        IO.sendAnswer();
        //Reset chatHistoryIndex
        chatHistoryIndex = chatHistoryStore.length - 1;
        //console.log("chatHistIndex is "+chatHistoryIndex);
      }
    }
    
    //console.log(event.which);
    
    if( event.which == 38 ){
      
      //console.log(chatHistoryStore);
      //console.log("chatHistoryIndex is "+chatHistoryIndex);
      prevChatWord = chatHistoryStore[chatHistoryIndex];
      //console.log("Prev word is "+prevChatWord);
      chatHistoryIndex--;
      //Populate previousWord in the text field

      //$inputMessage.focus();
      $inputMessage.val(prevChatWord);
    
    }
    
    /*
    if( event.which == 40 ){
      
      //console.log(chatHistoryStore);
      //console.log("chatHistoryIndex is "+chatHistoryIndex);
      if(chatHistoryIndex < chatHistoryStore.length -1){
        prevChatWord = chatHistoryStore[chatHistoryIndex+1];
        //console.log("Prev word is "+prevChatWord);
        chatHistoryIndex++;
        //Populate previousWord in the text field

        //$inputMessage.focus();
        $inputMessage.val(prevChatWord);
      }
    
    }
    */
    
  
  
  });
  
  //Start game is pressed
  $startGameBtn.on("click",function(e){
    IO.hostStartGame();
  });
  
  /*Helpers for displaying messages in chat window*/
  var Message = {
    // Log a message
    "log": function(message, options) {
      var textColor = "";
      if(typeof options !== 'undefined' && typeof options.color !== 'undefined'){
        textColor = options.color;
      }
      var $el = $('<li>').addClass('log').text(message).css("color",textColor);
      this.addMessageElement($el, options);
    },
    "addMessageElement":function(el, options) {
      var $el = $(el);

      // Setup default options
      if (!options) {
        options = {};
      }
      if (typeof options.fade === 'undefined') {
        options.fade = true;
      }
      if (typeof options.prepend === 'undefined') {
        options.prepend = false;
      }

      // Apply options
      if (options.fade) {
        $el.hide().fadeIn(FADE_TIME);
      }
      if (options.prepend) {
        $messages.prepend($el);
      } else {
        $messages.append($el);
      }
      $messages[0].scrollTop = $messages[0].scrollHeight;
    }
  
  }

  
});
