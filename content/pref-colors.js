// Custom colors used in the <colorpicker> for selecting user comment hilighting
//
// In HSB colorspace, B is constant at 100, H varies from 0-360 in steps of 36 per column,
// and S by row is 5,10,20,30,60,80
const FARKY_COLORS= [
	[
		"#fff2f2",
		"#fffaf2",
		"#fcfff2",
		"#f5fff2",
		"#f2fff7",
		"#f2ffff",
		"#f2f7ff",
		"#f5f2ff",
		"#fcf2ff",
		"#fff2fa"
	],

	[
		"#ffe5e5",
		"#fff5e5",
		"#faffe5",
		"#ebffe5",
		"#e5fff0",
		"#e5ffff",
		"#e5f0ff",
		"#ebe5ff",
		"#fae5ff",
		"#ffe5f5"
	],

	[
		"#ffcccc",
		"#ffebcc",
		"#f5ffcc",
		"#d6ffcc",
		"#ccffe0",
		"#ccffff",
		"#cce0ff",
		"#d6ccff",
		"#f5ccff",
		"#ffcceb"
	],

	[
		"#ffb2b2",
		"#ffe0b2",
		"#f0ffb2",
		"#c2ffb2",
		"#b2ffd1",
		"#b2ffff",
		"#b2d1ff",
		"#c2b2ff",
		"#f0b2ff",
		"#ffb2e0"
	],


	[
		"#ff6666",
		"#ffc266",
		"#e0ff66",
		"#85ff66",
		"#66ffa3",
		"#66ffff",
		"#66a3ff",
		"#8566ff",
		"#e066ff",
		"#ff66c2"
	],

	[
		"#ff3333",
		"#ffad33",
		"#d6ff33",
		"#5cff33",
		"#33ff85",
		"#33ffff",
		"#3385ff",
		"#5c33ff",
		"#d633ff",
		"#ff33ad"
	],

	[
		"#ffffff",
		"#575757",  // HSB = 0,0,34
		"#757575",  // steps of 12
		"#949494",
		"#b3b3b3",  // HSB = 0,0,70
		"#c2c2c2",  // steps of 6
		"#d1d1d1",
		"#e0e0e0",
		"#f0f0f0",
		"#f9f9f9"
	]
];


// Set custom colors in the color picker. The default colors are too strong for subtle
// coloring of a user's comment background. There doesn't appear to be a interface for
// doing this, so we have to twiddle bits we're not supposed to see.
//
// Ref: http://lxr.mozilla.org/aviarybranch/source/toolkit/content/widgets/colorpicker.xml
//
// "Accessing the Anonymous Content" in:
// Ref: http://xulplanet.com/tutorials/xultu/xblmethods.html
//
function FARKY_COLORPICKER_CUSTOMIZE(aPicker, aDocument) {

	//var buttonNodes = aDocument.getAnonymousNodes(aPicker);
	//var innerPicker = buttonNodes[1].childNodes[0].childNodes[0]

	var innerPicker = aPicker.mPicker;

	// 7 children, each is and <hbox> for a row in the picker. Each row child is a colored xul:spacer
	for (var rowNum = 0, row = innerPicker.mBox.childNodes[0]; row; rowNum++, row = row.nextSibling) {
		if (FARKY_COLORS[rowNum] == null) {
			row.style.display = "none";
			continue;
		}

		for (var colNum = 0, col = row.childNodes[0]; col; colNum++, col = col.nextSibling) {
			var newcolor = FARKY_COLORS[rowNum][colNum];

			col.setAttribute("color", newcolor);
			col.style.backgroundColor = newcolor;

			col.className = "colorpickertile cp-light";
			//col.class = "colorpickertile";
		}
	}

	// Set color, because the default is the window background (unobvious)
	aPicker.color = FARKY_COLORS[3][0];
}
