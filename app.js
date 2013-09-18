
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var user = require('./routes/user');
var http = require('http');
var path = require('path');
var pg = require('pg');

var conString = process.env.DATABASE_URL || "postgres://admin:@localhost/ppcc";


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

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  var table_parent_node = 'CREATE TABLE parent_node ( id SERIAL PRIMARY KEY NOT NULL, name TEXT NOT NULL, max INT NOT NULL, min INT NOT NULL)';
  client.query(table_parent_node, function(err, result) {
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log(result);
   });
});

pg.connect(conString, function(err, client, done) {
  if(err) {
    return console.error('error fetching client from pool', err);
  }
  var table_child_node = 'CREATE TABLE child_node ( random INT NOT NULL, parent_node_id INT NOT NULL)';
  client.query(table_child_node, function(err, result) {
    done();

    if(err) {
      return console.error('error running query', err);
    }
    console.log(result);
   });
});

app.get('/', function(req, res) {
	res.sendfile(__dirname + "/index.html");
});

io.configure(function() {
	io.set("transports", ["xhr-polling"]);
	io.set("polling duration", 10);
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
