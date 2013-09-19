var pg = require('pg');

 var PPCC_DB = function(io) {
 	this.io = io;
 };

PPCC_DB.prototype = {
	
	conString: process.env.DATABASE_URL || "postgres://admin:@localhost/ppcc",

	create_parent_table: function() {
		pg.connect(this.conString, function(err, client, done) {
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
	}, 

	create_child_table: function() {
		pg.connect(this.conString, function(err, client, done) {
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
	},

	insert_parent_node: function (name, max, min) {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
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
	},

	update_parent_node: function (id, name, max, min) {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
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
	},

	delete_parent_node: function(id) {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
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
	},

	add_child_node: function(id, random) {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
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
	},

	send_node_data: function(socket) {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  var select_parent_data = 'SELECT * FROM parent_node';
		  client.query(select_parent_data, function(err, parent_node_data) {
		    
		    if(err) {
		      return console.error('error running query', err);
		    }

		    var select_child_data = 'SELECT * FROM child_node';
		    client.query(select_child_data, function(err, child_node_data) {
			    done();
			    if(err) {
			      return console.error('error running query', err);
			    }
			    console.log(child_node_data.rows);
		    	socket.emit("node data", {"parent_node_data":parent_node_data.rows, "child_node_data": child_node_data.rows});
		    });   

		   });
		});	
	},

	wipe_database: function() {
		var io = this.io;
		pg.connect(this.conString, function(err, client, done) {
		  if(err) {
		    return console.error('error fetching client from pool', err);
		  }
		  var delete_parent_data = 'DELETE FROM parent_node';
		  client.query(delete_parent_data, function(err, parent_node_data) {
		    
		    if(err) {
		      return console.error('error running query', err);
		    }

		    var delete_child_data = 'DELETE FROM child_node';
		    client.query(delete_child_data, function(err, child_node_data) {
			    done();
			    if(err) {
			      return console.error('error running query', err);
			    }
		    	io.sockets.emit("wiped database");
		    });   

		   });
		});	
	}
};

module.exports.ppcc_db = null;
module.exports.init = function(io) {
	module.exports.ppcc_db = new PPCC_DB(io);
}  
 
























