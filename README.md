## Anagram MultiPlayer 
A multiplayer online game of Anagram, built using socket.io & JS

### How to Play:

* One player (the host) creates a "New Game"
* All other players join the game created by this host
* The game starts when the host presses the "Start Game" button

### Game Rules:

* Players have to guess the right meaningful word from the anagrams prompted by the bot
* Bot gives a first hint after 7s if no right answer is entered
* Bot gives a second hint after 5s if no right answer is entered
* If no answer is received after the above steps, the bot moves to the next word and the current round is finished

### Scoring:

* 3 points for answering without any hints
* 2 points after one hint
* 1 point after two hints
* Player who scores 30+ points the earliest wins

### Special Features:

* Players who get disconnected or close the game reflect in the scorecard of all other players live in that game
* Supports multiple game rooms and multiple players in each room at any time
* Included words data set of >2000 in count and words do not repeat ever in the game

### Shortcuts:

* Up Arrow for previous word (if any) to autofill in text box

### Play the Game

The game can be played at https://omniscient-effect.glitch.me/
