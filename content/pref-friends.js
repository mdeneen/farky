var FARKY_FRIENDS = {

    nameBox : null,
    noteBox : null,
    colorPicker : null,
    groupPicker : null,
    colorChoice : null,
    sampleText : null,
    sampleUser : null,
    sampleNote : null,
    usermode : null,
    modifymode : null,
    oldname : null,


    init : function() {
	try {
		var defaultname;

		FARKY.init();
		//FARKY_DATA.init();

		// Locate static page elements
		FARKY_FRIENDS.nameBox = document.getElementById("nameBox");
		FARKY_FRIENDS.noteBox = document.getElementById("noteBox");
		FARKY_FRIENDS.groupPicker = document.getElementById("groupPicker");
		FARKY_FRIENDS.colorPicker = document.getElementById("colorPicker");
		FARKY_FRIENDS.colorChoice = document.getElementById("colorChoice");
		FARKY_FRIENDS.sampleUser  = document.getElementById("sampleUser");
		FARKY_FRIENDS.sampleNote  = document.getElementById("sampleNote");
		FARKY_FRIENDS.sampleText  = document.getElementById("sampleText");

		FARKY_COLORPICKER_CUSTOMIZE(FARKY_FRIENDS.colorPicker, document);

		// Determine if this is an add or modify command, and if we're doing a user or a group.
		switch (window.arguments[0]) {
			case "add": 	FARKY_FRIENDS.modifymode = false; break;
			case "modify":	FARKY_FRIENDS.modifymode = true;  break;
			default:	throw("Bad add/modify arg '" + window.arguments[0] + "' in window options.");
		}

		switch (window.arguments[1]) {
			case "user":	FARKY_FRIENDS.usermode = true;  break;
			case "group":	FARKY_FRIENDS.usermode = false; break;
			default:	throw("Bad user/group arg '" + window.arguments[1] + 	"' in window options.");
		}

		defaultname = window.arguments[2];
		if (defaultname == undefined) defaultname = "";
		FARKY_FRIENDS.oldname = defaultname;


		// Setup window title and "ok" button.
		var dowhat = "";
		if (FARKY_FRIENDS.modifymode) { dowhat = "Edit "; } else { dowhat = "Add ";   }
		if (FARKY_FRIENDS.usermode)   { dowhat += "user";   } else { dowhat += "group"; }

		//document.documentElement.setAttribute("title", "Farky Friends - " + dowhat);
		document.title = "Farky Friends - " + dowhat;


		// Label the textfield properly
		var nametype = document.getElementById("nametype");
		if (FARKY_FRIENDS.usermode) { nametype.value = "User name:"; } else { nametype.value = "Group name:"; }


		// Initialize the list of group names. If editing a group, hide the unneeded selector.
		if (FARKY_FRIENDS.usermode) {
			var selectedIndex = 0;
			var menuitem = null;
			var groupMenu = document.getElementById("groupMenu");

			// Temporarily remove "Individual Color" entry. [This is a bit hackish, but having a
			// default entry probably helps the default widget box size render right.]
			var customColor = groupMenu.firstChild;
			groupMenu.removeChild(customColor);


			// Create menuitems for each friend group.
			var i = 0, sortedGroups = new Array();
			for (var group in FARKY_DATA.groups) { sortedGroups[i++] = group; }
			sortedGroups.sort();

			for (i = 0; i < sortedGroups.length; i++) {
				menuitem = document.createElement("menuitem");
				groupMenu.appendChild(menuitem);
				menuitem.label = sortedGroups[i];
				menuitem.value = FARKY_DATA.groups[sortedGroups[i]].color;
				if (FARKY_FRIENDS.modifymode && sortedGroups[i] == FARKY_DATA.friends[defaultname].group) {
					selectedIndex = i;
				}
			}

			// If user is a individual color, set index to where Individual Color entry will be.
			// Otherwise hide the colorpicker stuff until user selects Individual Color from menu.
			if (FARKY_FRIENDS.modifymode && FARKY_DATA.friends[defaultname].group == "") {
				selectedIndex = sortedGroups.length;
				FARKY_FRIENDS.colorPicker.color = FARKY_DATA.friends[defaultname].color;
			} else if (menuitem) {
				FARKY_FRIENDS.colorChoice.style.visibility = "hidden";
			}

			// Reattach "Individual Color" entry at the end.
			groupMenu.appendChild(customColor);

			// Select the appropriate menu item.
			FARKY_FRIENDS.groupPicker.selectedIndex = selectedIndex;

			if (FARKY_FRIENDS.modifymode) {
				FARKY_FRIENDS.noteBox.value = FARKY_DATA.friends[defaultname].note;
			}
		} else {
			document.getElementById("groupChoice").hidden = true;
			document.getElementById("noteRow").hidden = true;
			if (defaultname != "") { FARKY_FRIENDS.colorPicker.color = FARKY_DATA.groups[defaultname].color; }
		}

		// Set the group/user name if provided.
		FARKY_FRIENDS.nameBox.value = defaultname;

		// disable editing username in modify mode. ticket #4
		if (FARKY_FRIENDS.modifymode && FARKY_FRIENDS.usermode) {
			FARKY_FRIENDS.nameBox.disabled = true;
		}

		FARKY_FRIENDS.update_sampleTextUser();
		FARKY_FRIENDS.update_sampleTextNote();
		FARKY_FRIENDS.update_sampleTextColor();

	} catch (e) {
		alert("Farky: Failed to initialize Friends window: " + e);
	}
    },


    save : function() {
	  try {
		var color, newname, group, note;

		newname = FARKY_FRIENDS.nameBox.value;
		note    = FARKY_FRIENDS.noteBox.value;

		// Trim leading/trailing whitespace
		newname = newname.replace(/^\s+/,'').replace(/\s+$/,'');
		note    = note.replace(/^\s+/,'').replace(/\s+$/,'');

		// Check for empty input
		if (newname == "") {
			alert("You must enter a name.");
			return false;
		}

		// Check for special values used internally...
		if (!FARKY_FRIENDS.usermode && (
			newname == "Individual Color..." ||
			newname == "Individual Color" ||
			newname == "All Friends" ||
			newname.charAt(0) == '#')) {

			alert("Error: This is an invalid group name. Bad kitty!");
			return false;
		}

		// Check to see if the new (or modified) name already exists
		if (!FARKY_FRIENDS.modifymode || FARKY_FRIENDS.oldname != newname) {
			if (FARKY_FRIENDS.usermode && FARKY_DATA.friends[newname] || !FARKY_FRIENDS.usermode && FARKY_DATA.groups[newname]) {
				alert("Error: The name you have entered already exists.");
				return false;
			}
		}


		// Determine what color (anad perhaps group) was selected
		if (FARKY_FRIENDS.colorChoice.style.visibility == "hidden") {
			color = FARKY_FRIENDS.groupPicker.value;
			group = FARKY_FRIENDS.groupPicker.label;
		} else {
			color = FARKY_FRIENDS.colorPicker.color;
			group = "";
		}


		// If we're modifying and entry, remove the current entry first.
		if (FARKY_FRIENDS.modifymode) {
			if (FARKY_FRIENDS.usermode) {
				delete FARKY_DATA.friends[FARKY_FRIENDS.oldname];
			} else {
				var f;

				// If group name or color changed, update all users
				if (newname != FARKY_FRIENDS.oldname || FARKY_DATA.groups[FARKY_FRIENDS.oldname].color != color) {
					for (f in FARKY_DATA.friends) {
						if (FARKY_DATA.friends[f].group == FARKY_FRIENDS.oldname) {
							FARKY_DATA.friends[f].group = newname;
							FARKY_DATA.friends[f].color = color;
						}
					}
				}

				delete FARKY_DATA.groups[FARKY_FRIENDS.oldname];
			}
		}


		if (FARKY_FRIENDS.usermode) {
			FARKY_DATA.friends[newname] = new Array();
			FARKY_DATA.friends[newname].color = color;
			FARKY_DATA.friends[newname].group = group;
			FARKY_DATA.friends[newname].note  = note;
		} else {
			FARKY_DATA.groups[newname] = new Array();
			FARKY_DATA.groups[newname].color = color;
		}

		FARKY_DATA.save_friends();

		return true;

	} catch (e) {
		alert("Farky: Failed to save Friend Data: " + e);
		return false;
	}
    },


    update_sampleTextColor : function() {
	// If the color picker is hidden, use the color from the group selector instead.
	if (FARKY_FRIENDS.colorChoice.style.visibility == "hidden") {
		FARKY_FRIENDS.sampleText.style.backgroundColor = FARKY_FRIENDS.groupPicker.value;
	} else {
		FARKY_FRIENDS.sampleText.style.backgroundColor = FARKY_FRIENDS.colorPicker.color;		
	}
    },


    update_sampleTextUser : function() {

	if (!FARKY_FRIENDS.usermode) return;

	if (FARKY_FRIENDS.nameBox.value == "") {
		FARKY_FRIENDS.sampleUser.value = "Some Guy";
	} else {
		FARKY_FRIENDS.sampleUser.value = FARKY_FRIENDS.nameBox.value;
	}
    },


    update_sampleTextNote : function() {

	if (!FARKY_FRIENDS.usermode) return;

	FARKY_FRIENDS.sampleNote.value = FARKY_FRIENDS.noteBox.value;
    }
};
