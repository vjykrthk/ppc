
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
// var pg = require('pg');

// var conString = process.env.DATABASE_URL || "postgres://admin:@localhost/ppcc";


var app = express();

var server = http.createServer(app)
var io = require('socket.io').listen(server);

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

ppcc_db.create_parent_table();
ppcc_db.create_child_table();


app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html");
});

io.configure(function() {
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
});


io.sockets.on('connection', function(socket){
	ppcc_db.send_node_data(socket);
	socket.on("create root node", function() {
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

	socket.on("generate child", function(data) {
		console.log("generate child", data);
		ppcc_db.add_child_node(data.id, get_random_number(parseInt(data.max), parseInt(data.min)));
	});

	socket.on("wipe database", function() {
		ppcc_db.wipe_database();
	});
});

function get_random_number(mx, mn) {
	return Math.floor(Math.random() * (mx-mn)  + 1) + mn;
}
