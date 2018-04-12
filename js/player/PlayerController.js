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

		let socket = scope.socket = io.connect(document.location.hostname + ":3000?token=" + token);
		socket.on('connect_error', function() 
		{
			window.location = "serverdown.html";
		});
		socket.on("error", function()
		{
			scope.FatalError("Authentication failure!");
		});
		socket.on("server send authentication", function(user)
		{
			scope.playerID = user.id;
			scope.HUD2D.SetPlayerName(user.display_name);
		});

		// Continuously poll to check that the connection hasn't been lost:
		scope.pingSuccessful = true;
		scope.pingIntervalID = window.setInterval(function() {
			console.log(scope.pingSuccessful)
			console.log("PING");
			if (!scope.pingSuccessful) {
				window.clearInterval(scope.pingIntervalID);
				scope.FatalError("Connection to Server Lost. Please Refresh.");
			}
			else
			{
				scope.pingSuccessful = false;
				socket.emit("client send ping", {}, function() {
					console.log("PONG");
					scope.pingSuccessful = true;
				});
			}
		}, 10000); // every 10 sec
		
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
	this.location = false;
	this.quartersToDestination = false;
	this.lastLocation = false;
	this.possibleDestinations = []; // array of string map point IDs
	this.colocalPlayers = []; // array of IDs
	this.prices = {}; // indices: 'food', 'water', 'gas', 'treasure'
	this.trades = {}; // [partner ID]["get" or "receive"][resource names] => qtys being considered
	this.buySellQuantities = { food: 0, water: 0, gas: 0, treasure: 0 }; // qtys being considered
	this.seaCaptainAccessible = false;
	this.buySellEnabled = false;
	this.tradeEnabled = false;
	this.seaCaptainEnabled = false;

	this.cash = -1;
	this.food = -1;
	this.water = -1;
	this.gas = -1;
	this.treasure = -1;
	this.storage = -1;

	this.tradeOffers = [];
	this.cashInEscrow = 0;
	this.foodInEscrow = 0;
	this.waterInEscrow = 0;
	this.gasInEscrow = 0;
	this.treasureInEscrow = 0;
	this.storageSpaceInEscrow = 0;

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
		socket.on("server send updateDay", function(data, response)
		{
			// Pre-day cycle: status button and selectable map points and close all windows
			scope.HUD2D.SetStatusButtonState("waiting");
			scope.Map3D.SetSelectableMapPoints(false);
			scope.HUD2D.CloseWindows();

			// Ships (data.location, data.quartersToDestination, data.lastLocation, data.colocalPlayers)

			scope.HUD2D.SetLocation(
				scope.Map3D.mapPoints[data.location].displayName,
				data.quartersToDestination,
				scope.Map3D.mapPoints[data.lastLocation].displayName,
				scope.Map3D.mapPoints[data.location].bgColor,
				scope.Map3D.mapPoints[data.location].fgColor
			);

			scope.location = data.location;
			scope.quartersToDestination = data.quartersToDestination;
			scope.lastLocation = data.lastLocation;

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
				if (scope.colocalPlayers.includes(parseInt(id))) // continuing to be colocal
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
				if (id != scope.playerID && !data.colocalPlayers.includes(parseInt(id)))
					scope.Map3D.ships[id].Disappear();
			}

			// // update chat/trade options
			for (let id in scope.players)
			{
				let colocal = data.colocalPlayers.includes(parseInt(id));
				scope.HUD2D.SetPlayerChatEnabled(id, colocal);
				scope.HUD2D.SetPlayerTradeEnabled(id, colocal);
			}
			scope.tradeEnabled = data.colocalPlayers.length > 0;
			scope.HUD2D.SetTradeEnabled(scope.tradeEnabled);

			// Weather (data.weather)
			scope.HUD2D.SetWeather(data.weather);

			// Death (data.isDead)
			scope.HUD2D.SetDead(data.isDead, scope.dayNumber);

			// Buying and Selling (data.prices)
			scope.prices = data.prices;
			scope.HUD2D.SetFoodPrice(scope.prices.food);
			scope.HUD2D.SetWaterPrice(scope.prices.water);
			scope.HUD2D.SetGasPrice(scope.prices.gas);
			scope.HUD2D.SetTreasureValue(scope.prices.treasure);
			scope.buySellQuantities = {food: 0, water: 0, gas: 0, treasure: 0}; // reset buy/sell window

			scope.buySellEnabled = Object.values(scope.prices).reduce((accumulator, currentValue) => accumulator || (currentValue !== false), false);
			scope.HUD2D.SetBuySellEnabled(scope.buySellEnabled);

			// Day number (data.day, data.weather)
			if (scope.dayNumber !== false) { // this isn't the first day
				scope.dayNumber = data.day
				scope.Map3D.PassDay(data.weather, function()
				{ // upon new day arrival
					onNewDay();
				});
			}
			else // this is the first day
			{
				scope.Map3D.SetWeather(data.weather);
				scope.dayNumber = data.day
				onNewDay();
			}
			scope.HUD2D.SetDayNumber(scope.dayNumber);

			// Trading:
			scope.trades = {};
			scope.HUD2D.SetTradeQuantitiesAndStatus(scope.HUD2D.openTradePartnerID, undefined, true); // "go back" in the trade window
			scope.cashInEscrow = 0;
			scope.foodInEscrow = 0;
			scope.waterInEscrow = 0;
			scope.gasInEscrow = 0;
			scope.treasureInEscrow = 0;
			scope.storageSpaceInEscrow = 0;
			scope.UpdateResources();

			// things to be done when the new day arrives
			function onNewDay()
			{
				if (!data.isDead)
				{
					// Actions (data.hasAction, data.possibleDestinations, data.seaCaptainAccessible)
					scope.hasAction = data.hasAction;
					scope.possibleDestinations = data.possibleDestinations;
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

					scope.seaCaptainAccessible = data.seaCaptainAccessible;
					scope.HUD2D.SetSeaCaptainMessage(false); // reset the sea captain window
					scope.seaCaptainEnabled = scope.hasAction && scope.seaCaptainAccessible;
					scope.HUD2D.SetSeaCaptainEnabled(scope.seaCaptainEnabled);

					scope.HUD2D.SetAlertsWindowEnabled(true);

					scope.HUD2D.SetStatusButtonState("enabled");

					// Alerts (data.alerts)
					// if(scope.dayNumber == 0)
						setTimeout(()=>{scope.HUD2D.AddAlertsDay("Day " + scope.dayNumber, data.alerts);}, 2000);
					// else
						// scope.HUD2D.AddAlertsDay("Day " + scope.dayNumber, data.alerts);

					// Pirates (data.pirateAttack)
					// TODO!

					// callback!
					if (response) response();
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
				let colocal = data.players[i].colocal;

				if (!Object.keys(scope.players).includes(id.toString())) // we don't already know about this player
				{
					scope.players[id] = name; // add to this.players
					scope.Map3D.AddShip(id, name, (id == scope.playerID)); // add ship to map
					if (id != scope.playerID) {
						scope.HUD2D.AddPlayer(id, name); // add to chat/trade options

						if (colocal && !scope.colocalPlayers.includes(id) && scope.location) {
							scope.Map3D.ships[id].MoveTo(
								scope.Map3D.mapPoints[scope.location],
								scope.quartersToDestination,
								scope.Map3D.mapPoints[scope.lastLocation]
							);
							
							scope.HUD2D.SetTradeEnabled(true);
							
							scope.colocalPlayers.push(id);
						}
						scope.HUD2D.SetPlayerChatEnabled(id, colocal);
						scope.HUD2D.SetPlayerTradeEnabled(id, colocal);
					}
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

			scope.UpdateResources();
		});

		/**
		 * Handle Trade Offer Notification
		 */
		socket.on("server send notifyTradeOffer", function(data)
		{
			let partnerID = data.partnerID;

			data.trade.status = "received";
			scope.trades[partnerID] = data.trade;

			scope.tradeOffers.push(partnerID);

			if (scope.tradeOffers.length == 1) // no other offer(s) being displayed
			{
				scope.HUD2D.ShowTradeForPartner(partnerID);
				window.sounds.fadeInOut("notificationBell", 0, 1, 0); //play a notification sound

				// trap the player on this screen until they make a decision
				scope.HUD2D.SetAlertsWindowEnabled(false);
				scope.HUD2D.SetBuySellEnabled(false);
				scope.HUD2D.SetSeaCaptainEnabled(false);
			}
		});

		/**
		 * Handle Trade Acceptance Notification
		 */
		socket.on("server send notifyTradeAccept", function(data)
		{
			let partnerID = data.partnerID;

			notifyTradeAcceptOrDecline(partnerID);

			scope.HUD2D.AlertBalloon(scope.players[partnerID] + " accepted your trade offer!", true);
		});

		/**
		 * Handle Trade Declination Notification
		 */
		socket.on("server send notifyTradeDecline", function(data)
		{
			let partnerID = data.partnerID;

			notifyTradeAcceptOrDecline(partnerID);

			scope.HUD2D.AlertBalloon(scope.players[partnerID] + " declined your trade offer.", true);
		});

		function notifyTradeAcceptOrDecline(partnerID)
		{
			let trade = scope.trades[partnerID];

			// Update escrow values
			scope.cashInEscrow -= trade.give.cash;
			scope.foodInEscrow -= trade.give.food;
			scope.waterInEscrow -= trade.give.water;
			scope.gasInEscrow -= trade.give.gas;
			scope.treasureInEscrow -= trade.give.treasure;
			let maxUsedStorage = trade.receive.food + trade.receive.water + trade.receive.gas + trade.receive.treasure - trade.give.food - trade.give.water - trade.give.gas - trade.receive.treasure;
			if (maxUsedStorage > 0) scope.storageSpaceInEscrow -= maxUsedStorage;

			//
			scope.UpdateResources();
			scope.HUD2D.SetTradeQuantitiesAndStatus(partnerID, undefined, true);

			// Update trade
			scope.ResetTrade(partnerID);
			scope.UpdateTradeQuantity(partnerID);
		}

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
					senderName: (scope.players[message.senderID] !== undefined ? scope.players[message.senderID] : "First Mate"),
					urgent: (message.urgent != 0),
					text: message.text,
					timestamp: message.timestamp
				};
				scope.chatMessages[otherUserID].push(messageObject);
				scope.HUD2D.AddChatMessage(otherUserID, messageObject); // add the chat message to the chat pane, if it is open
				if (!outgoing && message.newMessages)
				{ // alert the arrival of a new message
					scope.HUD2D.AlertBalloon(messageObject.senderName + ": " + messageObject.text, false, function() {
						 scope.HUD2D.ShowChatMessages(otherUserID);
					});
				}
			}
		});

		/**
		 * Handle End Game
		 */
		socket.on("server send endGame", function(data) {
			setTimeout(()=>{scope.HUD2D.showGameOverScreen();}, 4000);
		});
	},

	/**
	 * Call this after changing resource values
	 */
	UpdateResources: function()
	{
		let scope = this;

		scope.HUD2D.SetCash(scope.cash, scope.cashInEscrow);
		scope.HUD2D.SetFood(scope.food, scope.foodInEscrow, scope.dayNumber <= 0);
		scope.HUD2D.SetWater(scope.water, scope.waterInEscrow, scope.dayNumber <= 0);
		scope.HUD2D.SetGas(scope.gas, scope.gasInEscrow, scope.dayNumber <= 0);
		scope.HUD2D.SetTreasure(scope.treasure, scope.treasureInEscrow);
		scope.HUD2D.SetStorage(scope.GetUsedStorage(), scope.storageSpaceInEscrow, scope.storage);

		scope.UpdateBuySellQuantity();
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
		if (this.Map3D.selectedMapPoint) {
			this.seaCaptainEnabled = false;
			this.HUD2D.SetSeaCaptainEnabled(false);
		}
	},

	/**
	 * Trigger a fatal error. Display an error message, then redirect back to login.html.
	 * @param message A description of the error.
	 */
	FatalError: function(message)
	{
		$.alertable.alert(message).always(function() {
	      window.location.href = "login.html";
	    });
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

			let newCash = scope.cash - scope.cashInEscrow - prices.food*qtys.food - prices.water*qtys.water - prices.gas*qtys.gas + prices.treasure*qtys.treasure;
			let newUsedStorage = scope.GetUsedStorage() + scope.storageSpaceInEscrow + qtys.food + qtys.water + qtys.gas - qtys.treasure;

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
	 * Update the trade quantities under consideration for a particular trading partner.
	 * @param partnerID Trade partner's user ID.
	 * @param item One of "cash", "food", "water", "gas", or "treasure".
	 * @param side One of "give" or "receive".
	 * @param changeBy The integer amount which to add to the currently considered quantity.
	 */
	UpdateTradeQuantity: function (partnerID, item, side, changeBy)
	{
		let scope = this;

		if (this.trades[partnerID] === undefined)
		{
			this.ResetTrade(partnerID);
		}

		function allowed()
		{
			let trade = scope.trades[partnerID];

			let resources = ["cash", "food", "water", "gas", "treasure"];
			for (let i in resources)
			{
				let resource = resources[i];
				if (trade.give[resource] < 0 || trade.receive[resource] < 0) return false; // no negative quantities
				if (trade.give[resource] > scope[resource] - scope[resource + "InEscrow"]) return false; // can't offer more than you have!
			}

			let newUsedStorage = scope.GetUsedStorage() + scope.storageSpaceInEscrow;
			newUsedStorage -= trade.give.food + trade.give.water + trade.give.gas + trade.give.treasure;
			newUsedStorage += trade.receive.food + trade.receive.water + trade.receive.gas + trade.receive.treasure;

			return (newUsedStorage <= scope.storage);
		}

		let status = this.trades[partnerID].status
		if (status == "planning")
		{
			if (item !== undefined)
			{
				this.trades[partnerID][side][item] += changeBy;

				if (!allowed()) // disallowed update -- revert it
					this.trades[partnerID][side][item] -= changeBy;
			}

			if (!allowed()) // it's no good, just reset
				this.ResetTrade(partnerID);
		}

		if (status == "received")
		{ // check if the offer is accept-able
			this.HUD2D.SetTradeAcceptEnabled(allowed());
		}

		// Done updating values, update the HUD
		this.HUD2D.SetTradeQuantitiesAndStatus(partnerID, this.trades[partnerID]);
	},

	/**
	 * Reset a trade with a particular partner.
	 * @param partnerID The user ID of the trade partner.
	 */
	ResetTrade: function(partnerID)
	{
		this.trades[partnerID] = {
			give: {
				cash: 0, food: 0, water: 0, gas: 0, treasure: 0
			},
			receive: {
				cash: 0, food: 0, water: 0, gas: 0, treasure: 0
			},
			status: "planning" // also: "sent", "received"
		};
		$("#trade-title").text(""); //reset trade title text
		
	},

	/**
	 * Send the active trade offer.
	 * @param partnerID The user ID of the trade partner to whom to send a trade offer.
	 */
	SendTradeOffer: function(partnerID)
	{
		this.UpdateTradeQuantity(partnerID);
		let trade = this.trades[partnerID];

		// Update Escrow values
		this.cashInEscrow += trade.give.cash;
		this.foodInEscrow += trade.give.food;
		this.waterInEscrow += trade.give.water;
		this.gasInEscrow += trade.give.gas;
		this.treasureInEscrow += trade.give.treasure;
		let maxUsedStorage = trade.receive.food + trade.receive.water + trade.receive.gas + trade.receive.treasure - trade.give.food - trade.give.water - trade.give.gas - trade.receive.treasure;
		if (maxUsedStorage > 0) this.storageSpaceInEscrow += maxUsedStorage;

		// Emit
		this.socket.emit("player send offerTrade", { partnerID: partnerID, trade: trade });

		// Update trade status
		trade.status = "sent";

		this.HUD2D.SetTradeQuantitiesAndStatus(partnerID, trade);
		this.UpdateResources();
	},

	/**
	 * Accept a received trade offer.
	 * @param partnerID The user ID of the trade partner whose offer to accept.
	 */
	AcceptTradeOffer: function(partnerID)
	{
		this._AcceptOrDeclineTradeOffer(partnerID);

		this.socket.emit("player send acceptTrade", { partnerID: partnerID });
	},

	/**
	 * Decline a received trade offer.
	 * @param partnerID The user ID of the trade partner whose offer to decline.
	 */
	DeclineTradeOffer: function(partnerID)
	{
		this._AcceptOrDeclineTradeOffer(partnerID);

		this.socket.emit("player send declineTrade", { partnerID: partnerID });
	},

	/**
	 * Perform actions common to accepting or declining logic.
	 * @param partnerID The user ID of the trade partner whose offer is being accepted or declined.
	 */
	_AcceptOrDeclineTradeOffer: function(partnerID)
	{
		let scope = this;
		
		//
		this.ResetTrade(partnerID);
		this.HUD2D.SetTradeQuantitiesAndStatus(partnerID, this.trades[partnerID], true);

		this.tradeOffers.shift();
		if (this.tradeOffers.length > 0) // there is another queued trade offer
		{
			setTimeout(function() {
				scope.HUD2D.ShowTradeForPartner(scope.tradeOffers[0]); // display the next offer from the queue
			}, 500);
		}
		else
		{ // unlock HUD
			this.HUD2D.SetAlertsWindowEnabled(true);
			this.HUD2D.SetBuySellEnabled(this.buySellEnabled);
			this.HUD2D.SetSeaCaptainEnabled(this.seaCaptainEnabled);
		}
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
	},

	/**
	 * Consult the sea captain.
	 * @param topic Either "weather" or "pirates".
	 */
	ConsultSeaCaptain: function(topic)
	{
		let scope = this;

		if (topic != "weather" && topic != "pirates") return; // invalid topic

		if (this.seaCaptainAccessible && this.hasAction)
		{
			// expend the player's action
			this.hasAction = false;
			this.Map3D.SetSelectableMapPoints(false);

			// emit!
			this.socket.emit("player function consultSeaCaptain", { topic: topic }, function(response) {
				if (response.success)
				{
					scope.HUD2D.SetSeaCaptainMessage(response.message);
				}
				else // failure!
				{
					scope.hasAction = true;
					scope.Map3D.SetSelectableMapPoints(scope.possibleDestinations);
				}
			});
		}
	}
};
