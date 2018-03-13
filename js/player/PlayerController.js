var PlayerController = function()
{
	let scope = this;
	
	// Init 2D HUD:
	this.HUD2D = new HUD(this);
	this.HUD2D.Load(window, document.getElementById("hud-container"));
	
	// Open socket
	let token = getUrlParameter("token");
	if (!token)
		window.location.assign("login.html");
	
	let socket = this.socket = io.connect("localhost:3000?token=" + token);
	socket.on("error", function()
	{
		scope.FatalError("Authentication failure!");
	});
	socket.on("server send authentication", function(user)
	{
		scope.playerID = user.id;
		scope.HUD2D.SetPlayerName(user.display_name);
	});
	
	// Initialize member variables
	
	// this.playerID
	this.players = {}; // id => display name
	this.dayNumber = false;
	this.hasAction = false;
	// this.colocalPlayers; // array of IDs
	this.prices = {}; // indices: 'food', 'water', 'gas', 'treasure'
	this.seaCaptainAccessible = false;
	this.cash = -1;
	this.food = -1;
	this.water = -1;
	this.gas = -1;
	this.treasure = -1;
	this.storage = -1;
	this.chatMessages = { "broadcast": [] }; // other user ID (or 'broadcast') => array of message objects (sent and recieved)
		
	// Init 3D map and start game
	this.Map3D = new THMap(this);
	this.Map3D.Start(window, document.getElementById("game-container"), function() {
		scope._RegisterSocketHandlers();
		
		// send joinGame
		socket.emit("player send joinGame", {}, function(data) {
			if (!data.success)
			{
				scope.FatalError(data.error);
			}
		});
	});
};

PlayerController.prototype = {
	
	/**
	 * Register handlers for incoming events sent by the server.
	 */
	_RegisterSocketHandlers: function()
	{
		let scope = this;
		let socket = this.socket;
		
		/**
		 * Handle Update Day
		 */
		socket.on("server send updateDay", function(data)
		{
			// Pre-day cycle: status button and selectable map points
			scope.HUD2D.SetStatusButtonState("waiting");
			scope.Map3D.SetSelectableMapPoints(false);
			
			// Day number (data.day)
			if (scope.dayNumber !== false) { // this isn't the first day
				scope.Map3D.PassDay(data.weather, function()
				{ // upon new day arrival
					onNewDay();
				});
			}
			else // this is the first day
			{
				onNewDay();
			}
			scope.dayNumber = data.day;
			scope.HUD2D.SetDayNumber(scope.dayNumber);	
			
			// Ships (data.location, data.quartersToDestination, data.lastLocation, data.colocalPlayers)
			
			scope.HUD2D.SetLocation(
				scope.Map3D.mapPoints[data.location].displayName,
				data.quartersToDestination,
				scope.Map3D.mapPoints[data.lastLocation].displayName
			);
			
			scope.Map3D.localShip.MoveTo(
				scope.Map3D.mapPoints[data.location],
				data.quartersToDestination,
				scope.Map3D.mapPoints[data.lastLocation],
				function()
				{
					// Teleport & appear newly colocal ships
					for (let i in data.colocalPlayers)
					{
						let id = data.colocalPlayers[i];
						scope.Map3D.ships[id].MoveTo(
							scope.Map3D.mapPoints[data.location],
							data.quartersToDestination,
							scope.Map3D.mapPoints[data.lastLocation]
						);
					}
				}
			);
			
			// // move continuing colocal ships
			for (let i in data.colocalPlayers)
			{
				let id = data.colocalPlayers[i];
				if (scope.colocalPlayers.includes(id)) // continuing to be colocal
				{
					scope.Map3D.ships[id].MoveTo( // the ship should move alongside us!
						scope.Map3D.mapPoints[data.location],
						data.quartersToDestination,
						scope.Map3D.mapPoints[data.lastLocation]
					);					
				}
			}
			scope.colocalPlayers = data.colocalPlayers; // record the new set of colocal players
			
			// // disappear all non-colocal ships
			for (let id in scope.players)
			{
				if (id != scope.playerID && !data.colocalPlayers.includes(id))
					scope.Map3D.ships[id].Disappear();
			}
			
			// // update chat/trade options
			for (let id in scope.players)
			{
				let colocal = data.colocalPlayers.includes(id);
				scope.HUD2D.SetPlayerChatEnabled(id, colocal);
				scope.HUD2D.SetPlayerTradeEnabled(id, colocal);
			}
			
			// Weather (data.weather)
			scope.HUD2D.SetWeather(data.weather);
			
			// Death (data.isDead)
			scope.HUD2D.SetDead(data.isDead);
			
			// Buying and Selling (data.prices)
			scope.prices = data.prices;
			scope.HUD2D.SetFoodPrice(scope.prices.food);
			scope.HUD2D.SetWaterPrice(scope.prices.water);
			scope.HUD2D.SetGasPrice(scope.prices.gas);
			scope.HUD2D.SetTreasureValue(scope.prices.treasure);
			
			let enableBuySell = Object.values(scope.prices).reduce((accumulator, currentValue) => accumulator || (currentValue !== false), false);
			scope.HUD2D.SetBuySellEnabled(enableBuySell);
			
			// things to be done when the new day arrives
			function onNewDay()
			{
				if (!data.isDead)
				{
					// Actions (data.hasAction, data.possibleDestinations, data.seaCaptainAccessible)			
					scope.hasAction = data.hasAction;
					if (scope.hasAction && (data.possibleDestinations.length > 1 || data.quartersToDestination))
					{ // display destination selection
						scope.Map3D.SetSelectableMapPoints(data.possibleDestinations);
						if (data.possibleDestinations.length == 1) // don't bother letting them pick their one and only option
							scope.Map3D.SetSelectedMapPoint(data.possibleDestinations[0]);
						else // give them the choice -- select nothing by default
							scope.Map3D.SetSelectedMapPoint(false);
						scope.Map3D.mapPointSelectionEnabled = true;
					}
					else
					{
						scope.Map3D.SetSelectableMapPoints(false);
					}
					
					scope.HUD2D.SetSeaCaptainEnabled(scope.hasAction && scope.seaCaptainAccessible);
					
					scope.HUD2D.SetStatusButtonState("enabled");
					
					// Alerts (data.alerts)
					// TODO
								
					// Pirates (data.pirateAttack)
					// TODO!
				}			
			}
		});
		
		/**
		 * Handle Update Players
		 */
		socket.on("server send updatePlayers", function(data)
		{
			for (let i in data.players)
			{
				let id = data.players[i].id;
				let name = data.players[i].name;
				
				if (!Object.keys(scope.players).includes(id)) // we don't already know about this player
				{
					scope.players[id] = name; // add to this.players
					scope.Map3D.AddShip(id, name, (id == scope.playerID)); // add ship to map
					if (!id == scope.playerID) scope.HUD2D.AddPlayer(id, name); // add to chat/trade options
				}
			}
		});
		
		/**
		 * Handle Update Resources
		 */
		socket.on("server send updateResources", function(data)
		{
			scope.cash = data.cash;
			scope.food = data.food;
			scope.water = data.water;
			scope.gas = data.gas;
			scope.treasure = data.treasure;
			scope.storage = data.storage;
			
			scope.HUD2D.SetCash(scope.cash);
			scope.HUD2D.SetFood(scope.food);
			scope.HUD2D.SetWater(scope.water);
			scope.HUD2D.SetGas(scope.gas);
			scope.HUD2D.SetTreasure(scope.treasure);
			scope.HUD2D.SetStorage(scope.GetUsedStorage(), scope.storage);
		});
		
		/**
		 * Handle Update Chat
		 */
		socket.on("server send updateChat", function(data) {
			for (let i in data.messages) // for each message
			{
				let message = data.messages[i];
				
				let outgoing = (message.senderID == scope.playerID);
				let otherUserID = (outgoing ? message.recipientID : message.senderID);
				if (message.broadcast) otherUserID = "broadcast";
				
				if (!scope.chatMessages[otherUserID]) scope.chatMessages[otherUserID] = [];
				let messageObject = {
					outgoing: outgoing,
					senderID: message.senderID,
					urgent: message.urgent,
					text: message.text,
					timestamp: message.timestamp
				};
				scope.chatMessages[otherUserID].push(messageObject);
				
				HUD2D.AddChatMessage(messageObject); // add the chat message to the chat pane, if it is open
				if (!outgoing && message.newMessage) HUD2D.AlertChatMessage(messageObject); // alert the arrival of a new message
			}
		});
		
		/**
		 * Handle End Game
		 */
		socket.on("server send endGame", function(data) {
			console.log("END GAME"); // TODO
		});
	},
	
	/**
	 * Get amount of currently used storage. (i.e. food + water + gas + treasure)
	 * @returns Used storage
	 */
	GetUsedStorage: function()
	{
		return this.food + this.water + this.gas + this.treasure;
	},
	
	/**
	 * Get all the chat messages needed for a chat pane.
	 * @param otherUserID The ID of the other user, or "broadcast".
	 * @returns An array of message objects.
	 */
	GetChatMessages: function(otherUserID)
	{
		let messages = this.chatMessages[otherUserID] || [];
		// TODO: sort messages by timestamp?
		return messages;
	},
	
	/**
	 * Ready up. Send destination selection to server.
	 */
	EndTurn: function()
	{
		// status button
		scope.HUD2D.SetStatusButtonState("waiting");

		// destination selection
		scope.Map3D.mapPointSelectionEnabled = false; // selection is locked in
		socket.emit("player send ready", { destination: scope.Map3D.selectedMapPoint }, function(data) {
			if (!data.success)
			{
				scope.FatalError(data.error);
			}
		});
		
		// if destination chosen, no more talking to sea captain
		if (scope.Map3D.selectedMapPoint) this.SetSeaCaptainEnabled(false);
	},
	
	/**
	 * Trigger a fatal error. Display an error message, then redirect back to login.html.
	 * @param message A description of the error.
	 */
	FatalError: function(message)
	{
		// TODO
		alert(message);
	}
	
};