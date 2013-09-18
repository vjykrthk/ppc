
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
  	console.log("process.env.DATABASE_URL", process.env.DATABASE_URL);
    return console.error('error fetching client from pool', err);
  }
  var table_parent_node = 'CREATE TABLE IF NOT EXISTS parent_node ( id SERIAL PRIMARY KEY NOT NULL, name TEXT NOT NULL, max INT NOT NULL, min INT NOT NULL)';
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
  var table_child_node = 'CREATE TABLE IF NOT EXISTS child_node ( random INT NOT NULL, parent_node_id INT NOT NULL)';
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
		console.log("create a parent node", data);
		insert_parent_node(data.name, data.max, data.min);
	});

	socket.on("edit parent node", function(data) {
		console.log("edit parent node", data);
		update_parent_node(data.id, data.name, data.max, data.min);		
	});

	socket.on("delete parent node", function(data) {
		console.log("delete parent node", data);
		delete_parent_node(data.id);
	});

	socket.on("generate child", function(data) {
		console.log("generate child", data);
		var mx = parseInt(data.max);
		var mn = parseInt(data.min);
		var random = Math.floor(Math.random() * (mx-mn)  + 1) + mn;
		add_child_node(data.id, random);
	});
});


function insert_parent_node(name, max, min) {
	pg.connect(conString, function(err, client, done) {
	  if(err) {
	    return console.error('error fetching client from pool', err);
	  }
	  var insert_parent_node = 'INSERT INTO parent_node(name, max, min) VALUES($1, $2, $3) RETURNING id';
	  client.query(insert_parent_node, [name, max, min], function(err, result) {
	    done();

	    if(err) {
	      return console.error('error running query', err);
	    }

	    var data = { "id":result.rows[0].id, "name":name, "max":max, "min":min };
	    io.sockets.emit("create a parent node", data);
	   });
	});	
}

function update_parent_node(id, name, max, min) {
	pg.connect(conString, function(err, client, done) {
	  if(err) {
	    return console.error('error fetching client from pool', err);
	  }
	  var update_parent_node = 'UPDATE parent_node SET name = $1, max = $2, min = $3 WHERE id = $4';
	  client.query(update_parent_node, [name, max, min, id], function(err, result) {
	    done();

	    if(err) {
	      return console.error('error running query', err);
	    }

	    var data = { "id":id, "name":name, "max":max, "min":min };
	    io.sockets.emit("edit parent node", data);;
	   });
	});		
}

function delete_parent_node(id) {
	pg.connect(conString, function(err, client, done) {
	  if(err) {
	    return console.error('error fetching client from pool', err);
	  }
	  var delete_parent_node = 'DELETE FROM parent_node WHERE id = $1';
	  client.query(delete_parent_node, [id], function(err, result) {
	    
	    if(err) {
	      return console.error('error running query', err);
	    }
	    var delete_child_node = 'DELETE FROM child_node WHERE parent_node_id = $1'
	    client.query(delete_child_node, [id], function(err, result) {
	    	done();
	    	if(err) {
	     		return console.error('error running query', err);
	    	}
	    	io.sockets.emit("delete parent node", { "id":id });
	    });	    
	   });
	});	
}


function add_child_node(id, random) {
	pg.connect(conString, function(err, client, done) {
	  if(err) {
	    return console.error('error fetching client from pool', err);
	  }
	  var insert_child_node = 'INSERT INTO child_node(random, parent_node_id) VALUES($1, $2)';
	  client.query(insert_child_node, [random, id], function(err, result) {
	    done();

	    if(err) {
	      return console.error('error running query', err);
	    }
	    io.sockets.emit("generate child", { "id": id, "random": random});
	   });
	});	
}