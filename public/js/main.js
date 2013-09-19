$(function() {
	window.dialog_form = $('#dialog-form');
	window.socket = io.connect();
	
	$("#root_reset_link").on('click', function(evt) {
		evt.preventDefault();
		var $this = $(this);
		if($this.hasClass("root_node_create")) {
			socket.emit("create root node");
		} else {
			console.log("false");
			socket.emit("wipe database");
		}
			
	});

	socket.on("create root node", function() {
		createRootNode();
		change_to_resetlink();
		addCreateParentNodeLink();
	});

	socket.on("create a parent node", function(data) {
		 createParentNode(data.id, data.name, data.max, data.min);
	});

	socket.on("edit parent node", function(data) {
		editParentNode(data.id, data.name, data.max, data.min);
	});

	socket.on("delete parent node", function(data) {
		$("#"+data.id).remove();
	});

	socket.on('generate child', function(data) {
		createChildNode(data.id, data.random);
	});

	socket.on('node data', function(node_data) {
		var parent_data = node_data.parent_node_data;
		var child_data = node_data.child_node_data; 
		console.log(parent_data.length == 0);
		if(parent_data.length != 0) {
			change_to_resetlink();
			createRootNode();
			addCreateParentNodeLink();
			append_parent_nodes(parent_data);
			console.log(child_data);
			append_child_nodes(child_data);
		}
	
	});

	socket.on('wiped database', function() {
		change_to_rootlink();
		$('#tree_container').html("");
	});
});

function createRootNode() {
	console.log(this);
	var nodeData = { id:"root_node", text:"Root node", class:"root_node"}
	var root = Handlebars.compile($('#node-template').html());
	$('#tree_container').append(root(nodeData));
}

function change_to_rootlink() {
	var $rrl = $("#root_reset_link");
	$rrl.toggleClass("root_node_create");
	$rrl.html("Create root");
	$rrl.siblings().remove();
}

function change_to_resetlink() {
	var $rrl = $("#root_reset_link");
	$rrl.toggleClass("root_node_create");
	$rrl.html("Reset");
}

function addCreateParentNodeLink() {
	var parent_link = $("<a>", {href:"#", text:"Create a parent node"});
	$('#links_container').append(parent_link);
	createDialog();
	parent_link.click( function(evt) {
		evt.preventDefault();
		dialog_form.dialog("open");
	});
}

function createDialog(target) {
	var name = $('#name'), 
	max = $('#max'), 
	min = $('#min'), 
	tips = $('.validateTips');
	$target = $(target);
	var button_text = "Create parent node";
	if(target != undefined) {
		name.val($target.data('name'));
		max.val($target.data('max'));
		min.val($target.data('min'));
		button_text = "Edit parent node"
	}	

	$( "#dialog-form" ).dialog({
      autoOpen: false,
      width: 400,
      modal: true,
      buttons: [{
      		text:button_text,
      		click: function() {
	        		var valid = true
	        		valid = checkName(name.val(), tips) && valid;
	        		valid = valid && checkNumeric(max.val(), tips);
	        		valid = valid && checkNumeric(min.val(), tips);
	        		valid = valid && checkMaxIsGreater(max.val(), min.val(), tips);
	       		
		       		if(valid && target == undefined) {
		       			socket.emit("create a parent node", {name:name.val(), max:max.val(), min:min.val()});
		       		} else {
		       			socket.emit("edit parent node", {id:$target.attr('id'), name:name.val(), max:max.val(), min:min.val()});
		       		}
	       			$(this).dialog("close");
       			}
      		},

      		{
      			text:"Cancel",
      			click: function() {
 			        	 $(this).dialog( "close" );
        		}
      		}      		
      ],
        
      close: function() {
        name.val("");
        max.val("");
        min.val("");
      }
    });
}


function createParentNode(id, name, max, min) {
	var text = name + "(" + min + "-" + max + ")";
	var template = Handlebars.compile($('#node-template').html());
	
	var parentNode = template({ id:id, text:text, class:"parent_node" });

	var rootNode = $('#tree_container > ul >li'); 
	
	rootNode.append(parentNode);

	parent_node = rootNode.find('#'+id).find('li'); 

	parent_node.data({"name":name, "min":min, "max":max});

	parent_node.contextmenu({
		menu: [
			{title:"Edit", cmd:"edit"},
			{title:"Delete", cmd:"delete"},
			{title:"Generate", cmd:"generate"}
		],
		select: function(event, ui) {
			var $target = $(event.target);
			switch(ui.cmd) {
				case 'edit':
					createDialog(event.target);
					dialog_form.dialog("open");
					break;
				case 'delete':
					socket.emit("delete parent node", { id:$target.attr('id') });
					break;
				case 'generate':
					var data = { id:$target.attr('id'), max:$target.data("max"), min:$target.data("min") };
					socket.emit("generate child", data )
					break;
			}
		}
	});
}

function editParentNode(id, name, max, min) {
	var parentNode = $("#"+id);
	parentNode.data({"name":name, "max":max, "min":min});
	parentNode.find('li').first().html(name + "(" + min + "-" + max + ")");
}

function createChildNode(id, random) {
	var $target = $("#"+id);
	var $child_node = $("<ul><li>" + random + " <span class=\"delete_child\">[x]</span></li></ul>");

	$target.append($child_node);
}


function checkName(name, tips) {
	if(3 > name.length || name.length > 12) {
		tips.text("Name should be between 3 and 12 characters")
		return false;
	}
	return true;
}


function checkNumeric(n, tips) {
	if(!$.isNumeric(n) || n < 0) {
		tips.text("Max and Min should be integer");
		return false;
	}
	return true;
}

function checkMaxIsGreater(max, min, tips) {
	if(max < min) {
		tips.text("Max should be greater than min");
		return false;
	}
	return true;
}

function append_parent_nodes(parent_data) {
	parent_data.forEach(function(data, index) {
		createParentNode(data.id, data.name, data.max, data.min);	
	});
}

function append_child_nodes(child_data) {
	child_data.forEach(function(data, index) {
		createChildNode(data.parent_node_id, data.random);	
	});
}




