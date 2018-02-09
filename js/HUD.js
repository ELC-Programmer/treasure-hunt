var HUD = function()
{
	//
}

HUD.prototype = {
	
	/**
	 * Load the 2D HUD
	 * @param window The window in which to draw the map.
	 * @param containerElement The HTML element in which to draw the map.
	 */
	Load: function(window, containerElement) {
		
		// load hud.html
		$.get("./hud.html", function(data) {
			$(containerElement).html(data);
		}, "text");
	}
}