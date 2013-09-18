$(function() {
	window.dialog_form = $('#dialog-form');
	window.socket = io.connect();
	
	$("#root_create").on('click', function(evt) {
		evt.preventDefault();
		socket.emit("create root node");
	});

	socket.on("create root node", function() {
		createRootNode();
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
		createChildNode(data.id, data.random)
	});
});

function createRootNode() {
	var nodeData = { id:"root_node", text:"Root node"}
	var root = Handlebars.compile($('#node-template').html());
	$('#tree_container').append(root(nodeData));
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
	
	var parentNode = template({ id:id, text:text });

	var rootNode = $('#tree_container > ul >li'); 
	
	rootNode.append(parentNode);

	rootNode.find('#'+id).data({"name":name, "min":min, "max":max});

	rootNode.find('#'+id).contextmenu({
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

	$target.append("<ul><li>" + random + "</li></ul>");
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




