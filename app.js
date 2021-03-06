
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');

var app = express();

var server = http.createServer(app)
var io = require('socket.io').listen(server);

var storage = require('node-persist');

storage.initSync();

// all environments
app.set('port', process.env.PORT || 5000);
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

var db = require('./db/ppcc_db');

db.init(io);

var ppcc_db = db.ppcc_db;

app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html");
});

io.configure(function() {
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
});


io.sockets.on('connection', function(socket){
	ppcc_db.send_node_data(socket, storage.getItem('root_node'));
	socket.on("create root node", function() {
		storage.setItem('root_node', true);
		io.sockets.emit("create root node");
	});

	socket.on("create a parent node", function(data) {
		console.log("create a parent node", data);
		ppcc_db.insert_parent_node(data.name, data.max, data.min);
	});

	socket.on("edit parent node", function(data) {
		console.log("edit parent node", data);
		ppcc_db.update_parent_node(data.id, data.name, data.max, data.min);		
	});

	socket.on("delete parent node", function(data) {
		console.log("delete parent node", data);
		ppcc_db.delete_parent_node(data.id);
	});

	socket.on("generate children", function(data) {
		console.log("generate children", data);
		var randomList = new Array();
		while(randomList.length < data.number_of_children) {
			 randomList.push(get_random_number(parseInt(data.max), parseInt(data.min)));	
		}
		ppcc_db.add_child_nodes(data.parent_node_id, randomList);
	});

	socket.on("delete child node", function(data) {
		ppcc_db.delete_child_node(data.child_id);
	});

	socket.on("wipe database", function() {
		storage.setItem('root_node', false);
		ppcc_db.wipe_database();
	});
});

function get_random_number(mx, mn) {
	return Math.floor(Math.random() * (mx-mn)  + 1) + mn;
}
