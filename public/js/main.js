$(function() {
	
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

	socket.on('generate children', function(data) {
		var parent_node = $('#'+data[0].parent_node_id).find('.child');
						
		parent_node.html("");

		data.forEach(function(d) {
			createChildNode(d.child_node_id, d.parent_node_id, d.random);
		});
	});

	socket.on('delete child node', function(data) {
		console.log("server delete child node", data);
		deleteChildNode(data.child_node_id);
	});	

	socket.on('node data', function(node_data) {
		var parent_data = node_data.parent_node_data;
		var child_data = node_data.child_node_data; 
		
		if(node_data.root_node && node_data.root_node != undefined) {
			change_to_resetlink();
			createRootNode();
			addCreateParentNodeLink();
		}

		if(parent_data.length != 0) {
			append_parent_nodes(parent_data);
			append_child_nodes(child_data);
		}
	
	});

	socket.on('wiped database', function() {
		change_to_rootlink();
		$('#tree_container').html("");
	});
});

function cleanWhitespace(element) {
 // element = $(element);
 // console.log(element.childNodes);
 for (var i = 0; i < element.childNodes.length; i++) {
   var node = element.childNodes[i];
   if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
    $(element).remove(node);
 }

 console.log("cleanWhitespace", element.childNodes);
}

function createRootNode() {
	var root_node_template = Handlebars.compile($("#root-node-template").html());
	$('#tree_container').append(root_node_template());
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
	var parent_link = $("<button>", {text:"Create a parent node"});
	$('#links_container').append(parent_link);
	parent_link.click( function(evt) {
		evt.preventDefault();
		createDialog();
	});
}

function createDialog(target) {
	var name = $('#name'), 
	max = $('#max'), 
	min = $('#min'), 
	tips = $('.validateTips');
	$target = $(target),
	$dialog_form = $("#dialog-form");
	
	var button_text = "Create parent node";


	if(target != undefined) {
		name.val($target.data('name'));
		max.val($target.data('max'));
		min.val($target.data('min'));
		button_text = "Edit parent node"
	}

	$dialog_form.dialog({
      autoOpen: false,
      width: 400,
      modal: true,
      title: button_text,
      buttons: [{
      		text:button_text,
      		click: function() {
      				var nameVal = name.val(), 
      				maxVal = parseInt(max.val()),
      				minVal = parseInt(min.val()),
	        		valid = true;
	        		valid = checkName(nameVal, tips) && valid;
	        		valid = valid && checkNumeric(maxVal, tips);
	        		valid = valid && checkNumeric(minVal, tips);
	        		valid = valid && checkMaxIsGreater(maxVal, minVal, tips);


	        		if(valid) {
						if(target == undefined) {
		       				socket.emit("create a parent node", {name:name.val(), max:max.val(), min:min.val()});
		       			} else {
		       				socket.emit("edit parent node", {id:$target.attr('id'), name:name.val(), max:max.val(), min:min.val()});
		       			}	        			
	        			$(this).dialog("close");
	        		}	       			
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

	$dialog_form.dialog("open");
}

function createGeneratorDialog(data) {
	var $children_generator = $('#children_generator'),
	$dialog_generator = $('#dialog-generate');
	
	$dialog_generator.dialog({
		autoOpen: false,
		modal: true,
		buttons: {
			"Generate" : function() {
				data.number_of_children = $children_generator.val();
				console.log("dialog_generator", data);
				socket.emit("generate children", data );
				$dialog_generator.dialog("close");
			},
			"Cancel" : function() {
				$dialog_generator.dialog("close");
			}
		}

	});	

	$dialog_generator.dialog("open");

}


function createParentNode(id, name, max, min) {
	var text = name + "(" + min + "-" + max + ")";
	var template = Handlebars.compile($('#parent-node-template').html());
	
	var parentNode = template({ id:id, text:text });

	var rootNode = $('#tree_container ul#parent_node_list'); 

	rootNode.append(parentNode);

	parentNode = rootNode.find('#'+id); 

	parentNode.data({"name":name, "min":min, "max":max});

	parentNode.contextmenu({
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
					break;
				case 'delete':
					socket.emit("delete parent node", { id:$target.attr('id') });
					break;
				case 'generate':
					var data = { parent_node_id:$target.attr('id'), max:$target.data("max"), min:$target.data("min") };
					createGeneratorDialog(data);
					break;
			}
		}
	});
}

function editParentNode(id, name, max, min) {
	var parentNode = $("#"+id);
	console.log("editParentNode", parentNode);
	parentNode.data({"name":name, "max":max, "min":min});
	parentNode.find('span.parent_title').html(name + "(" + min + "-" + max + ")");
}

function createChildNode(child_node_id, parent_node_id, random) {
	var $target = $("#"+parent_node_id);
	var template = Handlebars.compile($('#child-node-template').html());
	var child_node = template({ child_node_id:child_node_id, random:random });
	
	$target.find('.child').append(child_node);

	$childnode = $target.find('#child_node_'+child_node_id).find('span');
	$childnode.data("child_id", child_node_id);
	$childnode.on('click', function(evt) {
		evt.preventDefault();
		console.log('createChildNode', $(this).data('child_id'));
		socket.emit("delete child node", { child_id: $(this).data('child_id')});
	})
}

function deleteChildNode(child_node_id) {
	$('#child_node_'+child_node_id).remove();
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
	console.log("max, min", max, min, max < min);
	if(max <= min) {
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
		createChildNode(data.id, data.parent_node_id, data.random);	
	});
}




