Wars
====
A browser multiplayer turn-based strategy game

Developer setup
---------------
 1. Install node.js, mongodb and coffeescript
 
     git clone https://github.com/bzar/wars-gamenode.git 
     cd wars-gamenode 
     git checkout new-ui && git submodule update --init --recursive
     node wars
    
 1.  Development server runs at port 8888
 
Used libs and stuff
-------------------
 *  [Node.js][] - Server runtime
 *  [Gamenode][] - Client/server communication
   *  [Socket.io] - Communication transport layer
 *  [CoffeeScript][] - JavaScript replacement for client and server
 *  [LESS][] - Client stylesheets
 *  [ECT.js][] - Client HTML templates
 *  [Require.js][] - Client source dependency and module management
 *  [JQuery][] - DOM manipulation
 *  [Aja][] - Client animation
 *  [D3.js][] - Game statistic graphs
 *  [Sylvester][] - Matrix/vector math
 *  [FontAwesome][] - Client icons
 *  [Pixastic][] - Image manipulation for client
 *  [js2coffee][] - Javascript to CoffeeScript migration helper
 
[Node.js]: http://nodejs.org
[Gamenode]: https://github.com/bzar/gamenode
[Socket.io]: http://socket.io/
[CoffeeScript]: http://coffeescript.org
[LESS]: http://lesscss.org/
[ECT.js]: http://ectjs.com
[Require.js]: http://requirejs.org
[JQuery]: http://jquery.com/
[Aja]: https://github.com/bzar/aja
[D3.js]: http://d3js.org/
[Sylvester]: http://sylvester.jcoglan.com
[FontAwesome]: http://fortawesome.github.com/Font-Awesome/
[Pixastic]: http://www.pixastic.com
[js2coffee]: http://js2coffee.org/
