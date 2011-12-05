// Initialize when the options window opens
window.addEventListener("load", function() { FARKY_OPTIONS.init(); }, false);


var FARKY_OPTIONS = {
    ICONBASE : "chrome://farky/skin/preficons/",
    ICONS : [
	"abevigoda.png",
	"ackbar.png",
	"alizee-ani.gif",
	"arghclown.png",
	"aybabtu.png",
	"babyhead.png",
	"badger.gif",
	"banana.gif",
	"batboy.png",
	"boobies.png",
	"bounce.gif",
	"broken.png",
	"bushmission.png",
	"cheat.png",
	"clippy.png",
	"cowbell.gif",
	"creme.png",
	"demseal.png",
	"dobbs.png",
	"domo.png",
	"domo2.png",
	"drewbeer.png",
	"drpepper.png",
	"ellenfeiss.png",
	"fark.png",
	"farkback.png",
	"firefox.png",
	"girl.png",
	"hahaguy.png",
	"heineken.png",
	"hellokitty.png",
	"holygrail.png",
	"homestar.png",
	"hpz.png",
	"hypnotoad.png",
	"icyhot.png",
	"iraq.png",
	"iwanttobelieve.png",
	"jesus.png",
	"khaaan.gif",
	"kittens.png",
	"kitty.png",
	"limecat.png",
	"matrix.gif",
	"memento.png",
	"midget.png",
	"mozilla.png",
	"mspaint.png",
	"muddive.png",
	"mustard.png",
	"nancy.png",
	"nauga.png",
	"nelson.png",
	"oolongpancake.png",
	"orly.png",
	"party.png",
	"peterpanguy.png",
	"pickle.png",
	"priest.png",
	"quizzicaldog.png",
	"ricromero.png",
	"rubyshot.png",
	"screaming.png",
	"specialolympics.png",
	"spiral.gif",
	"squirrelnuts.png",
	"stfu.png",
	"storm.png",
	"strongbad.png",
	"tux.png",
	"walken.png",
	"wheaton.png",
	"wheaton2.png",
	"woowoo.gif"
	],

	treeState : new Array(),
	friendCount : null,


    ///////////////////////////////////////////////////////////
    // init
    //
    // Called by onload handler, initializes stuff in the window.
    //
    init : function() {
	FARKY.log("OPTIONS initializing...");


	// Customize colorpicker colors
	var colorpicker = document.getElementById("greenbar_colorpicker");
	FARKY_COLORPICKER_CUSTOMIZE(colorpicker, document);
	colorpicker.color = FARKY_DATA.prefs.getCharPref("headlines.greenbarColor");

	colorpicker = document.getElementById("markunread_colorpicker");
	FARKY_COLORPICKER_CUSTOMIZE(colorpicker, document);
	colorpicker.color = FARKY_DATA.prefs.getCharPref("comments.markUnreadColor");

	FARKY_OPTIONS.friendCount = document.getElementById("friendCount");

	// Randomize the icons in the options window
//	if (FARKY_DATA.prefs.getBoolPref("options.randomIcons")) {
//		FARKY_OPTIONS.randomize_icons();
//	}


	// Initialise the keywords list.
	FARKY_DATA.check_expired_filters();
	FARKY_OPTIONS.refresh_filterlist();

	// Initialize the friend list.
	FARKY_OPTIONS.refresh_friendlist();


	// Start the animations in the "server status" pane
	FARKY_OPTIONS.start_silly();

	// Hide Debug pane unless debug mode is on.
//	if (!FARKY_DATA.prefs.getBoolPref("debug"))
//	{
		// Hide the pane, just in case the following code fails.
//		document.getElementById("prefs_debug").hidden = true;

		// Hide the radiogroup name/icon so the debug pane can't be selected.
//		var prefwindow = document.getElementById("farky-options-dialog");

		// If debug pane is selected, reset to first pane
//		if (prefwindow.currentPane.label == "Debug") 
//		{
//			prefwindow.showPane(prefwindow.preferencePanes[0]);
//		}

		// Remove the last icon/label from the pane selector, so debug pane can't be selected.
//		var radiogroup = document.getAnonymousNodes(prefwindow)[0];
//		while (radiogroup && radiogroup.nodeName != "xul:radiogroup") { radiogroup = radiogroup.nextSibling; }
//		if (radiogroup) 
//		{
//			var size = radiogroup.childNodes.length;
//			radiogroup.removeItemAt(size - 1);
//		}	
//	}

	FARKY.log("OPTIONS initialized.");
    },


    ///////////////////////////////////////////////////////////
    // randomize_icons
    //
    // Randomly selects an icon for each of the preference pane selectors.
    // Icons will never be selected twice.
    //
    randomize_icons : function() {
	var i, r;
	var iconSet = this.ICONS.concat();  // make copy of icon list

	// The icons are within some anonymous content attached to the prefwindow.
	// Specifically, the first anonymous node is a xul:radiogroup, and each of its
	// children are xul:radio nodes, The xul:images nodes are under there, but they
	// inherit the SRC attribute from the radio node.
	//
	var radiogroup = document.getAnonymousNodes(document.documentElement)[0];

	for (i = 0; i < radiogroup.childNodes.length; i++) {
		r = Math.floor(Math.random() * iconSet.length);
		radiogroup.childNodes[i].setAttribute("src", this.ICONBASE + iconSet[r]);
		iconSet.splice(r, 1); // delete icon so it's not reused
	}
    },


    ///////////////////////////////////////////////////////////
    // refresh_filterlist
    //
    // Foo
    //
    refresh_filterlist : function () {
	var newRow;
	var filterTree = document.getElementById("filterTreeContent");
	function sortByKeyword(a,b) { if (a.keyword<b.keyword) return -1; if (b.keyword>a.keyword) return 1; return 0; };

	// Remove everything in the tree
	FARKY_OPTIONS.remove_children_recursive(filterTree);

	FARKY_DATA.filters.sort(sortByKeyword);

	// Populate the tree
	for (i = 0; i < FARKY_DATA.filters.length; i++) {
		newRow = FARKY_OPTIONS.build_filter_treerow(FARKY_DATA.filters[i]);
		filterTree.appendChild(newRow);
	}
    },


    ///////////////////////////////////////////////////////////
    //
    //
    //
    build_filter_treerow : function (filter) {
	var treeItem = document.createElement("treeitem");
	var treeRow = document.createElement("treerow");

	var col1 = document.createElement("treecell");
	col1.setAttribute("label", filter.keyword);

	var col2 = document.createElement("treecell");
	switch(filter.where) {
	    case "headline":  { col2.setAttribute("label", "Headline");   break; }
	    case "newsflash": { col2.setAttribute("label", "NewsFlash");  break; }
	    case "farktag":   { col2.setAttribute("label", "Fark Tag");   break; }
	    case "artlink":   { col2.setAttribute("label", "Article URL");   break; }
	    default:          { col2.setAttribute("label", filter.where); break; }
	}

	var col3 = document.createElement("treecell");
	switch(filter.action) {
	    case "hide":    { col3.setAttribute("label", "Delete");      break; }
	    case "hilight": { col3.setAttribute("label", "Hilight");     break; }
	    case "star":    { col3.setAttribute("label", "Add Star");    break; }
	    default:        { col3.setAttribute("label", filter.action); break; }
	}

	var col4 = document.createElement("treecell");
	col4.setAttribute("label", filter.color);
	col4.setAttribute("properties", "_" + filter.color.substr(1));

	var col5 = document.createElement("treecell");
	col5.setAttribute("label", FARKY_OPTIONS.pretty_time(filter.startTime));

	var col6 = document.createElement("treecell");
	var duration = "";
	if (filter.duration == "-1") {
		duration = "Forever";
	} else if (filter.duration == "0") {
		duration = "Session";
	} else {
		var d = filter.duration;

		var weeks = Math.floor(d / 604800);
		if (weeks) {
			duration = weeks + " week" + ((weeks == 1) ? "" : "s");
		}
		d -= 604800 * weeks;

		var days = Math.floor(d / 86400);
		if (days) {
			if (duration.length) { duration += ", "; }
			duration += days + " day" + ((days == 1) ? "" : "s");
		}
		d -= 86400 * days;

		var hours = Math.round(d / 3600);
		if (hours) {
			if (duration.length) { duration += ", "; }
			duration += hours + " hour" + ((hours == 1) ? "" : "s");
		}
		d -= 3600 * hours;
	}
	col6.setAttribute("label", duration);

	var col7 = document.createElement("treecell");
	col7.setAttribute("label", FARKY_OPTIONS.pretty_time(filter.endTime));

	var col8 = document.createElement("treecell");
	col8.setAttribute("label", filter.expired ? "Yes" : "No");

	var col9 = document.createElement("treecell");
	col9.setAttribute("label", filter.autodelete ? "Yes" : "No");

	treeRow.appendChild(col1);
	treeRow.appendChild(col2);
	treeRow.appendChild(col3);
	treeRow.appendChild(col4);
	treeRow.appendChild(col5);
	treeRow.appendChild(col6);
	treeRow.appendChild(col7);
	treeRow.appendChild(col8);
	treeRow.appendChild(col9);

	treeItem.appendChild(treeRow);

	return treeItem;
    },


    ///////////////////////////////////////////////////////////
    // filterEdit
    //
    //
    filterEdit : function(mode) {
	var index = -1;
	var entry = null;

	// Delete and modify change the selected item, so figure out what it is.
	if (mode == "modify" || mode == "delete") {
		var filterTree = document.getElementById("filterTree");
		index = filterTree.currentIndex;

		if (index == -1) {
			alert("You must select an entry to perform this operation.");
			return;
		}

		entry = FARKY_DATA.filters[index];

		var acol = filterTree.columns.getNamedColumn("keyword");
		var keyword = filterTree.view.getCellText(index, acol);

		if (keyword != entry.keyword) {
			alert("Error: interface and database out of sync. Close preference window and try again.");
			return;
		}
	}

	if (mode == "delete") {
		if (!confirm("Are you sure you want to delete this filter?")) return;

		FARKY_DATA.filters.splice(index, 1);
	} else {
		window.openDialog("chrome://farky/content/pref-filters.xul", "farkyFilters", "modal, resizable=no", mode, entry);
	}

	FARKY_DATA.save_filters();
	FARKY_OPTIONS.refresh_filterlist();
    },


    ///////////////////////////////////////////////////////////
    //
    //
    // Converts a timestamp (seconds since 1970) to a more
    // readable format. EG: "27 Mar 5:04pm"
    pretty_time : function (timestamp) {
	var month, time = "";

	if (timestamp == 0) return "End of session";

	if (timestamp == -1) return "Never";

	var date = new Date(timestamp * 1000);

	time += date.getDate();
	switch (date.getMonth()) {
		case 0:  { month = "Jan"; break; }
		case 1:  { month = "Feb"; break; }
		case 2:  { month = "Mar"; break; }
		case 3:  { month = "Apr"; break; }
		case 4:  { month = "May"; break; }
		case 5:  { month = "Jun"; break; }
		case 6:  { month = "Jul"; break; }
		case 7:  { month = "Aug"; break; }
		case 8:  { month = "Sep"; break; }
		case 9:  { month = "Oct"; break; }
		case 10: { month = "Nov"; break; }
		case 11: { month = "Dec"; break; }
	}
	time += " " + month + ", ";

	var hour = date.getHours();
	var ampm = (hour > 11) ? "pm" : "am"

	// Convert from 0-23 to 1-12am/pm
	if (hour > 12) {
		hour = Math.abs(hour - 12);
	} else  if (hour == 0) {
		hour = 12;
	}

	time += hour + ":" + date.getMinutes() + ampm

	return time;
    },


    ///////////////////////////////////////////////////////////
    // refresh_friendCount
    //
    // Updates the friend count thing under the friend list.
    //
    refresh_friendCount : function(count) {
	var witty = "You have " + count + " friends. ";

	if (count == 0) {
		witty += "You are a hopeless basement-dwelling Farker.";
	} else if (count == 1) {
		witty += "...But your mom doesn't really count.";
	} else if (count == 2) {
		witty += "Alas, a menage a trois requires REAL friends.";
	} else if (count == 3) {
		witty += "Looks like you've found some imaginary friends!";
	} else if (count == 4) {
		witty += "That's just sad.";
	} else if (count == 5) {
		witty += "Do you still play Magic: The Gathering with them?";
	} else if (count <= 10) {
		witty += "Is that everyone in your LARP party? (lightning bolt!)";
	} else if (count <= 15) {
		witty += "You must be very popular on MySpace.";
	} else if (count <= 20) {
		witty += "But do any of them actually know you?";
	} else if (count <= 25) {
		witty += "Wow! That's all your friends from FurryCON 2006!";
	} else if (count <= 30) {
		witty += "It's good to see that you've been getting out of the basement.";
	} else if (count <= 35) {
		witty += "That's very good... For me to poop on!";
	} else if (count <= 40) {
		witty += "Most of whom hate you.";
	} else if (count <= 45) {
		witty += "And yet, they barely fill the void that is your life.";
	} else if (count <= 50) {
		witty += "Careful, many of them want to touch your stuff.";
	} else if (count <= 60) {
		witty += "Now you can get group discounts to Star Trek conventions.";
	} else if (count == 69) {
		witty += "He he he he! 69! *giggle*";
	} else if (count <= 70) {
		witty += "That's over 9,750 pounds of friends!";
	} else if (count <= 80) {
		witty += "You've got a posse.";
	} else if (count <= 90) {
		witty += "Hey, now, it's not a popularity contest. (Or is it?!)";
	} else if (count <= 100) {
		witty += "With that many friends, the Fark party comes to you!";
	} else {
		witty += "Amazing! You're a true socialite, just like Paris Hilton.";
	}

	FARKY_OPTIONS.friendCount.value = witty;
    },


    ///////////////////////////////////////////////////////////
    // refresh_friendlist
    //
    // Deletes contents of the tree displaying friends/groups, and rebuilds it
    //
    refresh_friendlist : function() {
	var groupFolder, groupChildren;
	var friendTreeContent = document.getElementById("friendTreeContent");
	var i, j, row, empty, user, group, sortedFriends = new Array(), sortedGroups = new Array();

	function caseInsensitiveSort(a,b) {
		aa=a.toLowerCase(); bb=b.toLowerCase(); if (aa<bb) return -1; if (bb>aa) return 1; return 0;
	};

	FARKY.log("Refreshing friends list...");

	// Save state of any open container rows
	row = friendTreeContent.firstChild;
	while (row) {
		var open;

		if (row.nodeName != "treeitem") { continue; }

		open = row.getAttribute("open");
		group = row.firstChild.firstChild.getAttribute("label");

		FARKY_OPTIONS.treeState[group] = open;
		row = row.nextSibling;
	}

	// Remove any existing tree entries (recursively, to avoid possible mem leaks?)
	FARKY_OPTIONS.remove_children_recursive(friendTreeContent);

	i = 0;
	for (var user in FARKY_DATA.friends) { sortedFriends[i++] = user; }
	sortedFriends.sort(caseInsensitiveSort);

	i = 0;
	for (var group in FARKY_DATA.groups) { sortedGroups[i++] = group; }
	sortedGroups.sort(caseInsensitiveSort);


	// Add the special "All Friends" folder
	groupFolder = FARKY_OPTIONS.build_group_treerow("All Friends")
	groupChildren = document.createElement("treechildren");

	for (i = 0; i < sortedFriends.length; i++) {
		groupChildren.appendChild(FARKY_OPTIONS.build_user_treerow(sortedFriends[i]));
	}

	if (groupChildren.childNodes.length) {
		groupFolder.appendChild(groupChildren);
	} else {
		groupFolder.setAttribute("empty", true);
	}
	friendTreeContent.appendChild(groupFolder);


	// Add the special "Individual Color" folder
	groupFolder = FARKY_OPTIONS.build_group_treerow("Individual Color");
	groupChildren = document.createElement("treechildren");

	for (i = 0; i < sortedFriends.length; i++) {
		if (FARKY_DATA.friends[sortedFriends[i]].group != "") { continue; }
		groupChildren.appendChild(FARKY_OPTIONS.build_user_treerow(sortedFriends[i]));
	}

	if (groupChildren.childNodes.length) {
		groupFolder.appendChild(groupChildren);
	} else {
		groupFolder.setAttribute("empty", true);
	}
	friendTreeContent.appendChild(groupFolder);


	// Add folders for each friend group
	for (j = 0; j < sortedGroups.length; j++) {
		group = sortedGroups[j];
		empty = true;

		groupFolder = FARKY_OPTIONS.build_group_treerow(group);
		groupChildren = document.createElement("treechildren");
		for (i = 0; i < sortedFriends.length; i++) {
			if (FARKY_DATA.friends[sortedFriends[i]].group != group) { continue; }
			groupChildren.appendChild(FARKY_OPTIONS.build_user_treerow(sortedFriends[i]));
			empty = false;
		}
		
		if (groupChildren.childNodes.length) {
			groupFolder.appendChild(groupChildren);
		} else {
			groupFolder.setAttribute("empty", true);
		}

		friendTreeContent.appendChild(groupFolder);
			}

	FARKY_OPTIONS.refresh_friendCount(sortedFriends.length);
    },


    ///////////////////////////////////////////////////////////
    // remove_children_recursive
    //
    // Removes all (deep) children of a DOM node, from the bottom up.
    //
    remove_children_recursive : function(node) {
	while (node.hasChildNodes()) {
		FARKY_OPTIONS.remove_children_recursive(node.childNodes[0]);
		node.removeChild(node.childNodes[0]);
	}
    },


    ///////////////////////////////////////////////////////////
    // build_group_treerow
    //
    // Creates a tree entry for a group of users, as a container.
    //
    build_group_treerow : function(group) {
	var groupFolder, groupHeader, headerCell, groupChildren;

	groupFolder = document.createElement("treeitem");
	groupFolder.setAttribute("container", true);
	groupFolder.setAttribute("open", FARKY_OPTIONS.treeState[group]);
	groupFolder.setAttribute("property", "Folder");
	groupHeader = document.createElement("treerow");
	headerCell = document.createElement("treecell");
	headerCell.setAttribute("label", group);
	groupHeader.appendChild(headerCell);
	groupFolder.appendChild(groupHeader);

	return groupFolder;
    },


    ///////////////////////////////////////////////////////////
    // build_user_treerow
    //
    // Creates a tree entry for a specific user. Currently, every
    // entry will be contained within a group.
    //
    build_user_treerow : function(user) {
	var treeItem, treeRow, userCell, groupCell, colorCell, noteCell, groupName;

	groupName = FARKY_DATA.friends[user].group;
	if (!groupName) groupName = "Individual Color";

	treeItem = document.createElement("treeitem");
	treeRow = document.createElement("treerow");

	userCell  = document.createElement("treecell");
	groupCell = document.createElement("treecell");
	colorCell = document.createElement("treecell");
	noteCell  = document.createElement("treecell");

	userCell.setAttribute("label", user);
	groupCell.setAttribute("label", groupName);
	colorCell.setAttribute("label", FARKY_DATA.friends[user].color);
	noteCell.setAttribute("label", FARKY_DATA.friends[user].note);

	// Set "properties" to the color value, minus the leading "#".
	// It appears that tree style can only be changed via CSS, not programatically. So, we have to
	// make seperate style rules for each possible color. This prohibits use of a general purpose
	// (Photoshop-style) color picker.
	colorCell.setAttribute("properties", "_" + FARKY_DATA.friends[user].color.substr(1));

	treeRow.appendChild(userCell);
	treeRow.appendChild(groupCell);
	treeRow.appendChild(colorCell);
	treeRow.appendChild(noteCell);

	treeItem.appendChild(treeRow);

	return treeItem;
    },


    ///////////////////////////////////////////////////////////
    // friendEdit
    //
    // Multi-mode function to add, delete, or modify a group or user.
    //
    friendEdit : function(mode, type) {
	var name = "";

	// Delete and modify change the selected item, so figure out what it is.
	if (mode == "modify" || mode == "delete") {
		var friendTree = document.getElementById("friendTree");
		var i = friendTree.currentIndex;

		if (i == -1) {
			alert("You must select an entry to perform this operation.");
			return;
		}

		// seems odd this works on the container row (groups), but I'm not going to complain.

		var acol = friendTree.columns.getNamedColumn("username");
		name = friendTree.view.getCellText(i, acol);

		if (friendTree.view.isContainer(i)) {
			type = "group";
		} else {
			type = "user";
		}

		if (type == "group" && (name == "All Friends" || name == "Individual Color")) {
			alert("You cannot " + mode + " this special group.");
			return;
		}

		// Not worth the effort to implement automatic deletion of users in a group.
		if (type == "group" && mode == "delete" && !friendTree.view.isContainerEmpty(i)) {
			alert("This group is not empty. Remove all users from it before deleting.");
			return;
		}
	}

	if (mode == "delete") {
		if (!confirm("Are you sure you want to delete this " + type + "?")) return;

		if (type == "user") {
			delete FARKY_DATA.friends[name];
		} else {
			delete FARKY_DATA.groups[name];
		}
	} else {
		window.openDialog("chrome://farky/content/pref-friends.xul", "farkyFriends", "modal, resizable=no", mode, type, name);
	}

	FARKY_DATA.save_friends();
	FARKY_OPTIONS.refresh_friendlist();
    },


    ///////////////////////////////////////////////////////////
    // start_silly
    //
    // This function, uhh, seems to do... something.
    //
    start_silly : function() {
	var now = new Date();

	// Number of seconds since about 2 Sep 2005, a convient "start" time.
	var sec = (now.getTime() - 1125688700000) / 1000

	// Initialize the default textbox values. Setting a value in the XUL causes FF to
	// forget the default tab in the options window. Weird. Anyway, we base the initial
	// value on the current time and increment rates. The options window should display
	// roughly the same value even on different computers.
	document.getElementById('dupecounter').value   = Math.round(sec * 3.8509544787);
	document.getElementById('beercounter').value   = Math.round(sec * 0.5534875184);
	document.getElementById('stupidcounter').value = Math.round(sec * 9.8972099853);
	document.getElementById('newscounter').value = "42";
	document.getElementById('mysteryseries').value = "4";
	
	// No need to explicitly turn this off, it stops when our window is dismissed.
	setInterval("FARKY_OPTIONS.update_silly()", 100);
	//...returns an ID, could stop it with clearInterval(ID);
    },


    ///////////////////////////////////////////////////////////
    // update_silly
    //
    // Here we synchronize the database to an invariate contra-inverted
    // graph node. Or maybe we do something entirely different. Who knows?
    //
    update_silly : function() {
	var r, x, delta, node;

	r = Math.floor(Math.random() * 10);
	// Each case falls through. Thus, lower numbers are triggered less often than larger numbers.
	switch (r) {
		case 0:
			document.getElementById('beercounter').value++;
			if(Math.random() > 0.95) {
				//4,8,15,16,23,42
				node = document.getElementById('mysteryseries');
				if      (node.value == "4")  { node.value = "8"; }
				else if (node.value == "8")  { node.value = "15"; }
				else if (node.value == "15") { node.value = "16"; }
				else if (node.value == "16") { node.value = "23"; }
				else if (node.value == "23") { node.value = "42"; }
				else if (node.value == "42") { node.value = "4"; }
			}
		case 1:
		case 2:
			// Load varies from 0-30
			node = document.getElementById('totalfarkload');
			delta = Math.round(Math.random() * 10 - 5);
			x = parseInt(node.value) + delta;
			if (x > 30) { x = 30; } else if (x < 0) { x = 0; }
			node.value = x;
		case 3:
			document.getElementById('dupecounter').value++;
		case 4:
		case 5:
		case 6:
			// Load varies from 70-100
			node = document.getElementById('farkload');
			delta = Math.round(Math.random() * 10 - 5);
			x = parseInt(node.value) + delta;
			if (x > 100) { x = 100; } else if (x < 70) { x = 70; }
			node.value = x;
		case 7:
		case 8:
		case 9:
			document.getElementById('stupidcounter').value++;
	}
	return;
    }
};
