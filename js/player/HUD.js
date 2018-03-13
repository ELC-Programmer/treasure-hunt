var HUD = function(controller)
{
	this.controller = controller;
}

HUD.prototype = {
	
	/**
	 * Load the 2D HUD
	 * @param window The window in which to draw the map.
	 * @param containerElement The HTML element in which to include the HUD.
	 */
	Load: function(window, containerElement) {
		
		// load hud.html
		$.get("./hud.html", function(data) {
			$(containerElement).html(data);
		}, "text");
	},
	
	/**
	 * Set the player's name, as displayed in the bottom bar.
	 * @param name
	 */
	SetPlayerName: function(name)
	{
		$("#team-text").text(name);
	},
	
	/**
	 * Set the day number, as displayed in the bottom bar.
	 * @param dayNumber
	 */
	SetDayNumber: function(dayNumber)
	{
		$("#day-number-text").text(dayNumber);
	},
	
	/**
	 * Set the weather, as displayed in the bottom bar.
	 * @param weather A string identifying the weather conditions, either "sunny" or "rain".
	 */
	SetWeather: function(weather)
	{
		$("#weather-text").text(weather == "sunny" ? "Sunny" : "Raining");
	},
	
	/**
	 * Set the current location, as displayed in the bottom bar.
	 * @param location The name of the location
	 * @param quarters How many quarters of the way to the location we are. Optional.
	 * @param lastLocation The name of the location from which we are 'quarters' quarters to 'location'. Optional.
	 */
	SetLocation: function(location, quarters, lastLocation)
	{
		let suffix = "";
		if (quarters && lastLocation)
			suffix = " (" + (quarters == 2 ? 1 : quarters) + "/" + (quarters == 2 ? 2 : 4) + ")";
		
		$("#location-text").text(location + suffix);
	},
	
	/**
	 * Set amount of cash, as displayed in the sidebar.
	 * @param cash
	 */
	SetCash: function(cash)
	{
		$("#cash-text").text(cash);
	},
	
	/**
	 * Set amount of food, as displayed in the sidebar.
	 * @param food
	 */
	SetFood: function(food)
	{
		$("#food-text").text(food);
	},
	
	/**
	 * Set amount of water, as displayed in the sidebar.
	 * @param water
	 */
	SetWater: function(water)
	{
		$("#water-text").text(water);
	},
	
	/**
	 * Set amount of gas, as displayed in the sidebar.
	 * @param gas
	 */
	SetGas: function(gas)
	{
		$("#gas-text").text(gas);
	},
	
	/**
	 * Set amount of treasure, as displayed in the sidebar.
	 * @param treasure
	 */
	SetTreasure: function(treasure)
	{
		$("#treasure-text").text(treasure);
	},
	
	/**
	 * Set amount of storage in use and in total, as displayed in the sidebar.
	 * @param usedStorage
	 * @param totalStorage
	 */
	SetStorage: function(usedStorage, totalStorage)
	{
		$("#capacity-text").text(usedStorage + "/" + totalStorage);
	},
	
	/**
	 * Set price of food, as displayed in the buy/sell window.
	 * @param price An integer value, or false if buying food should be disabled.
	 */
	SetFoodPrice: function(price)
	{
		if (price !== false) // enabled
		{
			$("#food-price-text").text(price);
		}
		else
		{
			// TODO!
		}
	},
	
	/**
	 * Set price of water, as displayed in the buy/sell window.
	 * @param price An integer value, or false if buying water should be disabled.
	 */
	SetWaterPrice: function(price)
	{
		if (price !== false) // enabled
		{
			$("#water-price-text").text(price);
		}
		else
		{
			// TODO!
		}
	},
	
	/**
	 * Set price of gas, as displayed in the buy/sell window.
	 * @param price An integer value, or false if buying gas should be disabled.
	 */
	SetGasPrice: function(price)
	{
		if (price !== false) // enabled
		{
			$("#gas-price-text").text(price);
		}
		else
		{
			// TODO!
		}
	},
	
	/**
	 * Set value of treasure, as displayed in the buy/sell window.
	 * @param value An integer value, or false if selling treasure should be disabled.
	 */
	SetTreasureValue: function(value)
	{
		if (value !== false) // enabled
		{
			$("#treasure-value-text").text(value);
		}
		else
		{
			// TODO!
		}
	},
	
	/**
	 * Enable or disable the buy/sell window (and associated button).
	 * @param enabled A boolean indicating whether to enable the buy/sell window.
	 */
	SetBuySellEnabled: function(enabled)
	{
		// TODO: disable/enable button
		if (!enabled)
		{
			// TODO: close window if it is open
		}
	},
	
	/**
	 * Enable or disable the trade window (and associated button).
	 * @param enabled A boolean indicating whether to enable the trade window.
	 */
	SetTradeEnabled: function(enabled)
	{
		// TODO: disable/enable button
		if (!enabled)
		{
			// TODO: close window if it is open
		}
	},
	
	/**
	 * Enable or disable the sea captain window (and associated button).
	 * @param enabled A boolean indicating whether to enable the sea captain window.
	 */
	SetSeaCaptainEnabled: function(enabled)
	{
		// TODO: disable/enable button
		if (!enabled)
		{
			// TODO: close window if it is open
		}
	},
	
	/**
	 * Add a player to the chat and trade options.
	 * @param id The player's ID.
	 * @param name The player's display name.
	 */
	AddPlayer: function(id, name)
	{
		// TODO: add button for player to chat option list (alphabetically sorted)
		// TODO: add button for player to trade option list (alphabetically sorted)
	},
	
	/**
	 * Enable or disable the death overlay, etc.
	 * @param dead A boolean indicating whether the player is dead.
	 */
	SetDead: function(dead)
	{
		// TODO: activate some kind of death overlay that deactivates the 3DMap and displays a skull & crossbones.
		if (dead)
		{
			this.SetBuySellEnabled(false);
			this.SetTradeEnabled(false);
			this.SetSeaCaptainEnabled(false);
			
			this.SetStatusButtonState("dead");
		}
	},
	
	/**
	 * Enable or disable a player as a unicast chat option.
	 * @param id The player's ID.
	 * @param enabled A boolean indicating whether to enable the player.
	 */
	SetPlayerChatEnabled: function(id, enabled)
	{
		// TODO: update chat option button
		if (!enabled)
		{
			// TODO: kick out of unicast chat if it is currently open
		}
	},
	
	/**
	 * Enable or disable a player as a trade partner option.
	 * @param id The player's ID.
	 * @param enabled A boolean indicating whether to enable the player.
	 */
	SetPlayerTradeEnabled: function(id, enabled)
	{
		// TODO: update trade option button
		if (!enabled)
		{
			// TODO: kick out of trade offer window if it is currently open
		}
	},
	
	/**
	 * Add a chat message to the chat pane, if it is open.
	 * @param otherUserID The ID of the other user in this chat conversation, or "broadcast".
	 * @param message An object with members: "outgoing", "senderID", "urgent", "text", "timestamp".
	 */
	AddChatMessage: function(otherUserID, message)
	{
		// TODO: if the chat pane corresponding to "otherUserID" is open, add this message to it.
		// do NOT trigger an alert balloon. See AlertChatMessage()
	},
	
	/**
	 * Alert the arrival of a new chat message.
	 * @param otherUserID The ID of the other user in this chat conversation, or "broadcast".
	 * @param message An object with members: "outgoing", "senderID", "urgent", "text", "timestamp".
	 */
	AlertChatMessage: function(otherUserID, message)
	{
		// TODO: present an alert balloon
	},
	
	/**
	 * Set the state of the status button.
	 * @param state Either "enabled", "waiting", or "dead".
	 */
	SetStatusButtonState: function(state)
	{
		let statusButton = $("#status-circle");
		let statusText = $("#status-text");

		if (state == "enabled")
		{
			statusText.text("End Turn");
			statusButton.css("backgroundColor", "rgba(50, 200, 40, 0.85)"); // green
		}
		else if (state == "waiting")
		{
			statusText.text("Waiting");
			statusButton.css("backgroundColor", "rgba(220, 220, 0, 0.85)"); // yellow			
		}
		else if (state == "dead")
		{
			statusText.text("Dead");
			statusButton.css("backgroundColor", "rgba(110, 110, 110, 0.85)"); // grey			
		}
	}
}