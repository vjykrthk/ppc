
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');

var app = express();

var server = http.createServer(app)
var io = require('socket.io').listen(server);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

server.listen(app.get('port'));

console.log("Listening on port" + app.get('port'));

app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html")
});

io.sockets.on('connection', function(socket){

	socket.on("create root node", function() {
		io.sockets.emit("create root node");
	});

	socket.on("create a parent node", function(data) {
		console.log(data);
		io.sockets.emit("create a parent node", data);
	});

	socket.on("edit parent node", function(data) {
		console.log("edit parent node", data);
		io.sockets.emit("edit parent node", data);
	});

	socket.on("delete parent node", function(data) {
		io.sockets.emit("delete parent node", data);
	});

	socket.on("generate child", function(data) {
		console.log("generate child", data);
		var mx = parseInt(data.max);
		var mn = parseInt(data.min);
		var random = Math.floor(Math.random() * (mx-mn)  + 1) + mn;
		io.sockets.emit("generate child", { id: data.id, random: random});
	});
});
