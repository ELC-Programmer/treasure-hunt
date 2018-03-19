var PlayerController = function()
{
	let scope = this;
	
	// Init 2D HUD:
	this.HUD2D = new HUD(this);
	this.HUD2D.Load(window, document.getElementById("hud-container"), function() {
		
		// Open socket
		let token = getUrlParameter("token");
		if (!token)
			window.location.assign("login.html");
		
		let socket = scope.socket = io.connect("localhost:3000?token=" + token);
		socket.on("error", function()
		{
			scope.FatalError("Authentication failure!");
		});
		socket.on("server send authentication", function(user)
		{
			scope.playerID = user.id;
			scope.HUD2D.SetPlayerName(user.display_name);
		});
		
		// Init 3D map and start game
		scope.Map3D = new THMap(scope);
		scope.Map3D.Start(window, document.getElementById("game-container"), function() {
			scope._RegisterSocketHandlers();
			
			// send joinGame
			socket.emit("player send joinGame", {}, function(data) {
				if (!data.success)
				{
					scope.FatalError(data.error);
				}
			});
		});
	});
		
	// Initialize member variables
	
	// this.playerID
	this.players = {}; // id => display name
	this.dayNumber = false;
	this.hasAction = false;
	this.colocalPlayers = []; // array of IDs
	this.prices = {}; // indices: 'food', 'water', 'gas', 'treasure'
	this.buySellQuantities = { food: 0, water: 0, gas: 0, treasure: 0 }; // qtys being considered
	this.seaCaptainAccessible = false;
	this.cash = -1;
	this.food = -1;
	this.water = -1;
	this.gas = -1;
	this.treasure = -1;
	this.storage = -1;
	this.chatMessages = { "broadcast": [] }; // other user ID (or 'broadcast') => array of message objects (sent and recieved)
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
			scope.HUD2D.SetTradeEnabled(data.colocalPlayers.length > 0);
			
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
			scope.buySellQuantities = {food: 0, water: 0, gas: 0, treasure: 0}; // reset buy/sell window
			
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
			
			scope.UpdateBuySellQuantity();
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
					senderName: (scope.players[message.senderID] !== undefined ? scope.players[message.senderID] : "Facilitator"),
					urgent: (message.urgent != 0),
					text: message.text,
					timestamp: message.timestamp
				};
				scope.chatMessages[otherUserID].push(messageObject);
				
				scope.HUD2D.AddChatMessage(otherUserID, messageObject); // add the chat message to the chat pane, if it is open
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
		let scope = this;
		
		// status button
		this.HUD2D.SetStatusButtonState("waiting");

		// destination selection
		this.Map3D.mapPointSelectionEnabled = false; // selection is locked in
		let selectedMapPoint = this.Map3D.selectedMapPoint;
		
		
		this.socket.emit("player send ready", { destination: selectedMapPoint.id }, function(data) {
			if (!data.success)
			{
				scope.FatalError(data.error);
			}
		});
				
		// if destination chosen, no more talking to sea captain
		if (this.Map3D.selectedMapPoint) this.HUD2D.SetSeaCaptainEnabled(false);
	},
	
	/**
	 * Trigger a fatal error. Display an error message, then redirect back to login.html.
	 * @param message A description of the error.
	 */
	FatalError: function(message)
	{
		// TODO
		alert(message);
	},
	
	/**
	 * Send a chat message
	 * @param chatID The user ID of the recipient for unicast, or "broadcast" for broadcast.
	 * @param text The text of the message
	 */
	SendChatMessage: function(chatID, text)
	{
		this.socket.emit("player send chatMessage", {
			recipient: (chatID == "broadcast" ? false : chatID),
			text: text
		});
	},
	
	/**
	 * Update the buy/sell quantities being considered.
	 * @param item One of "food", "water", "gas", or "treasure".
	 * @param changeBy The integer amount which to add to the currently considered quantity.
	 */
	UpdateBuySellQuantity: function (item, changeBy, resetOnFail)
	{
		let scope = this;
		
		function allowed()
		{
			let prices = scope.prices;
			let qtys = scope.buySellQuantities;
				
			if (qtys.treasure > scope.treasure) return false; // can't sell treasure you don't have!
			let resources = ["food", "water", "gas", "treasure"];
			for (let i in resources)
			{
				let resource = resources[i];
				if (qtys[resource] < 0) return false; // no negative quantities
				if (prices[resource] === false && qtys[resource] != 0) return false; // can't buy something that's not for sale!
			}
				
			let newCash = scope.cash - prices.food*qtys.food - prices.water*qtys.water - prices.gas*qtys.gas + prices.treasure*qtys.treasure;
			let newUsedStorage = scope.GetUsedStorage() + qtys.food + qtys.water + qtys.gas - qtys.treasure;
			
			return (newCash >= 0 && newUsedStorage <= scope.storage);
		}
		
		if (item !== undefined)
		{
			this.buySellQuantities[item] += changeBy;
			
			if (!allowed()) // disallowed update -- revert it
				this.buySellQuantities[item] -= changeBy;
		}
		
		if (!allowed()) // still no good -- reset
			this.buySellQuantities = { food: 0, water: 0, gas: 0, treasure: 0 };
			
		// Done updating values, update the HUD
		this.HUD2D.SetBuySellQuantities(this.buySellQuantities);
	},
	
	/**
	 * Submit buy/sell deal.
	 */
	SubmitBuySell: function()
	{
		// Emit
		let transactions = [];
		if (this.buySellQuantities.food > 0)
			transactions.push({
				resource: "food",
				price: this.prices.food,
				quantity: this.buySellQuantities.food
			});
		if (this.buySellQuantities.water > 0)
			transactions.push({
				resource: "water",
				price: this.prices.water,
				quantity: this.buySellQuantities.water
			});
		if (this.buySellQuantities.gas > 0)
			transactions.push({
				resource: "gas",
				price: this.prices.gas,
				quantity: this.buySellQuantities.gas
			});
		if (this.buySellQuantities.treasure > 0)
			transactions.push({
				resource: "treasure",
				price: this.prices.treasure,
				quantity: this.buySellQuantities.treasure
			});
		this.socket.emit("player send buySell", { transactions: transactions }, function(response) {
			console.log(response);
		});
		
		// Update
		this.buySellQuantities = {food: 0, water: 0, gas: 0, treasure: 0};
		this.HUD2D.SetBuySellQuantities(this.buySellQuantities);		
	}
};