//global variables
var food_used;
var water_used;
var gas_used;
var global_half_speed;
//var global_qtr_speed;
var pirateBase_once = 0;
var same_place = 0;
var socket = {};
var username = "<?PHP echo $_SESSION['user']['username']; ?>";
var userGrouping = "<?PHP echo $_SESSION['user']['grouping']; ?>";
var dmLog = [];
var order_water = 0;
var order_gas = 0;
var order_food = 0;
var unread_dm = 0;
var days_out_of_fuel = 0;
var allData;

var msgSound = new Audio('audio/msg-sound.mp3');
var alertSound = new Audio('audio/alert-sound.mp3');


$('.modal').on('show.bs.modal', function () {
    $('.modal').not($(this)).each(function () {
        $(this).modal('hide');
    });
	setTimeout(function()
	{
		$("body").addClass("modal-open");
	}, 500);
	
});

// global variables to save state of trade with different partners
var allPartners = [];
function partner(partnerName, newPartner){
	this.partnerName = partnerName;
	this.cashOffer = newPartner ? 0 : $("#trade-offer-cash-qty").val();
	this.foodOffer = newPartner ? 0 : $("#trade-offer-food-qty").val();
	this.waterOffer = newPartner ? 0 : $("#trade-offer-water-qty").val();
	this.gasOffer = newPartner ? 0 : $("#trade-offer-gas-qty").val();
	this.treasureOffer = newPartner ? 0 : $("#trade-offer-treasure-qty").val();

	this.cashRecv = newPartner ? 0 : $("#trade-recv-cash-qty").val();
	this.foodRecv = newPartner ? 0 : $("#trade-recv-food-qty").val();
	this.waterRecv = newPartner ? 0 : $("#trade-recv-water-qty").val();
	this.gasRecv = newPartner ? 0 : $("#trade-recv-gas-qty").val();
	this.treasureRecv = newPartner ? 0 : $("#trade-recv-treasure-qty").val();	
}

//discourage refreshing the page
window.onbeforeunload = function() {
	return "WARNING! Refreshing may result the lost of progress.";
}

//runs on load
window.onload = function() {
	//Initilize
	$(function () {
		//Tooltips Plugin
		$('[data-toggle="tooltip"]').tooltip();
		//Setup socket.io for chat functionality
		console.log("running js");
		console.log("user grouping: "+userGrouping);
		if(window.location.hostname == "localhost")
		{
			socket = io("localhost:3000");
		}
		else
		{
			socket = io(window.location.hostname);
		}
		socket.on('connect', handleConnection);
		socket.on('message', handleNewMessage);
		socket.on('messageTrade', handleNewMessageTrade);
		socket.on('sos', handleSOS);
		socket.on('trade', handleTradeRequest);
		socket.on('receiveTrade', handleReceiveTrade);
		socket.on('declineTrade', handleDecline);
		socket.on('counterTrade', handleCounter);
		socket.on('reset', handleReset);

		$("#chat-send-button").click(sendChatMessage);
		$("#chat-send-button-trade").click(sendChatMessageTrade);
		$("#sos-button").click(sendSOSMessage);
		$('#trade-btn').click(resetTradeWindow);
		$("#send-trade-request").click(sendTradeRequest);
		$('#accept-trade-request').click(acceptTradeRequest);
		$('#decline-trade-request').click(declineTradeRequest);
		$('#counter-trade-request').click(counterTradeRequest);

		$('#chat-message-input').keypress(function (e) {
			  if (e.which == 13) {
				sendChatMessage();
				return false;
			  }
			});
		$('#chat-message-input-trade').keypress(function (e) {
			  if (e.which == 13) {
				sendChatMessageTrade();
				return false;
			  }
			});
		var chatPanelHeight = $("#map-image").height();
		$("#chat-panel").height(chatPanelHeight-55);
		//$("#current-speed-tooptip").attr("data-original-title", "Full Speed Ahead!");
	});

	//get selected item from list group
	$(function(){
    console.log('ready');

    updateTradeButton();
    

    var text = $(".list-group-item:first-child").text();
    $(".list-group-item:first-child").addClass("active");

    $("#trading-with-txt").text("Trading with " + text); 
    $("#trading-with-txt").val("Trading with " + text);
    $("#chat-with-txt").text("Chat with " + text); 
    $("#chat-with-txt").val("Chat with " + text);

   	// Initialize: Pushing all availale trade partners into allPartners with default value

   	$("#trade-partner-list").find("li").each(initPartners);

    $("#trade-partner-list").find("li").click(handleClickTradeParter);
	
	var resource_types = ["cash", "food", "water", "gas", "treasure"];
	
	resource_types.forEach(function(resource)
	{
		var plus = $("#trade-offer-"+resource+"-plus");
		var minus = $("#trade-offer-"+resource+"-minus");
		var qty = $("#trade-offer-"+resource+"-qty");
		
		
		plus.click((function(qty, resource)
		{
			return function()
			{
				console.log($("#trade-current-"+resource).val());
				
				var change = 1;
				if(resource == "cash")
				{
					change = 50;
				}
				if(parseInt(qty.val())+change <= $("#trade-current-"+resource).val())
				{
					qty.val(parseInt(qty.val())+change);
				}
				
			}
		})(qty, resource));
		
		minus.click((function(qty, resource)
		{
			return function()
			{
				var change = 1;
				if(resource == "cash")
				{
					change = 50;
				}
				if((qty.val()-change) >= 0)
				{
					qty.val(parseInt(qty.val())-change);
				}
			}
		})(qty, resource));
		
		
		plus = $("#trade-recv-"+resource+"-plus");
		minus = $("#trade-recv-"+resource+"-minus");
		qty = $("#trade-recv-"+resource+"-qty");
		
		plus.click((function(qty, resource)
		{
			return function()
			{
				var change = 1;
				if(resource == "cash")
				{
					change = 50;
				}
				qty.val(parseInt(qty.val())+change);
			}
		})(qty, resource));
		
		minus.click((function(qty, resource)
		{
			return function()
			{
				var change = 1;
				if(resource == "cash")
				{
					change = 50;
				}
				if((qty.val()-change) >= 0)
				{
					qty.val(parseInt(qty.val())-change);
				}
			}
		})(qty, resource));
	});
	
	
	//pirate attacks
	$('#dayMessageModal').on('hidden.bs.modal', function () {
		//pause everything
		$("video").each(function()
		{
			$(this).get(0).pause();
		});
		$("audio").each(function()
		{
			$(this).get(0).pause();
		});
		//PIRATES: Players that land on designated spots will lose all food, treasure, & half of your gas
		var currentLoc = $("#current-loc").val();
		if((currentLoc == 'B1') || (currentLoc == 'B2') || (currentLoc == 'T1') || (currentLoc == 'T2') || (currentLoc == 'SD3') || (currentLoc == 'SD4') || (currentLoc == 'Bruin Island')) {
			//If they have treasure
			if(allData['treasure'] >= 1) {
				//Update DB with player loses
				console.log("Pirate attack at sea");
				pirateAttack(false);
			}
			//If they go to the base
			if((allData['current_loc'] == 'Bruin Island') && (pirateBase_once == 0)) {
				console.log("Pirate attack at base");
				pirateAttack(true);
				//prevents an infinite loop
				pirateBase_once = 1;
			}
		}
	});	

});

// called when the browser is resized
$(window).resize(function(){
	var chatPanelHeight = $("#map-image").height();
	// console.log('map height:' + chatPanelHeight);
	$("#chat-panel").height(chatPanelHeight-55);
});

	//direct messaging drop-down button
	// $(function(){
	// 	$(".dropdown-menu").on("click", "li a", function(){
	// 		$("#dropdown-btn").text($(this).text());
	// 		$("#dropdown-btn").val($(this).text());
	// 	});
	// });


	//Get data and display it
	getPlayerData();

	//polls server to look facilitator approval every 5 seconds
	var polling = setInterval(function() {
		xmlhttp2 = new XMLHttpRequest();
		xmlhttp2.onreadystatechange = function() {
			if (xmlhttp2.readyState == 4 && xmlhttp2.status == 200) {
				
				var readyData = JSON.parse(xmlhttp2.responseText);
				var readyState = readyData['ready'];

				var selectedPartner = $("#trade-partner-list").find(".active").first().text();
				$("#trade-partner-list").empty();

				i = 0;
				while (readyData[i]) {
					// console.log("Partner: " + readyData[i]['username']);
					if (readyData[i]['username'] == selectedPartner) {
						$("#trade-partner-list").append(
							"<li class='list-group-item active'>" + readyData[i]['username'] + "</li>");
					} else {
						$("#trade-partner-list").append(
							"<li class='list-group-item'>" + readyData[i]['username'] + "</li>");
					}
					i++;
				}

    			$("#trade-partner-list").find("li").click(handleClickTradeParter);
				if($("#trade-partner-list").find(".active").length == 0) {
					$("#trade-partner-list").find("li").first().click();	
				}

    			updateTradeButton();
    			
				//if facilitator has advanced the simulation, end while loop and enable player submit button
				if(readyState == 1) {
					$("#go-btn").removeClass('btn btn-danger btn-block');             //change color
					$("#go-btn").addClass('btn btn-success btn-block'); 
					$("#go-btn").html('Ready!');                                      //change btn text
					$("#go-btn").removeAttr('disabled');
					$("#go-btn-tooltip").attr('data-original-title', '');
				} else {
					//change and disable button
					$("#go-btn").prop('disabled',true);
					$("#go-btn").removeClass('btn btn-success btn-block');
					$("#go-btn").addClass('btn btn-danger btn-block');
					$("#go-btn").html('Waiting for Facilitator...');
					$("#go-btn-tooltip").attr('data-original-title', 'Carefully consider your decisions. The button will turn green when you are able to advance.');                           
				}
			}
		}
		xmlhttp2.open("GET","player_serverpolling.php?token="+"<?PHP echo $_SESSION['user']['token']; ?>", true);
		xmlhttp2.send();
	}, 5000);

};

function handleReset()
{
	$("#chat-messages").empty();
}

//trade functions
function sendTradeRequest()
{

	if (parseInt($('#trade-offer-food-qty').val()) > parseInt($('#trade-current-food').val())){
		alert("You don't have the correct amount of resources to offer that trade!");
		return;
	}
	if (parseInt($('#trade-offer-water-qty').val()) > parseInt($('#trade-current-water').val())){
		alert("You don't have the correct amount of resources to offer that trade!");
		return;
	}
	if (parseInt($('#trade-offer-gas-qty').val()) > parseInt($('#trade-current-gas').val())){
		alert("You don't have the correct amount of resources to offer that trade!");
		return;
	}
	if (parseInt($('#trade-offer-cash-qty').val()) > parseInt($('#trade-current-cash').val())){
		alert("You don't have the correct amount of resources to offer that trade!");
		return;
	}
	if (parseInt($('#trade-offer-treasure-qty').val()) > parseInt($('#trade-current-treasure').val())){
		alert("You don't have the correct amount of resources to offer that trade!");
		return;
	}

	console.log('send clicked');
	var tradePartnerUsername = $("#trade-partner-list").find(".active").first().text();
	console.log(tradePartnerUsername);

	//for loops will be used later to cycle through resources to see how much has been selected of each and add it to the need/want objects of the tradeObj

	var resourceArray = ["water", "food", "gas", "cash", "treasure"];
	var _need = {};
	var _have = {};

	// resources to trade
	for(var i = 0; i < resourceArray.length; i++)
	{
		if ($("#trade-offer-"+resourceArray[i]+"-qty").val() > 0)
		{
			_have[resourceArray[i]] = $("#trade-offer-"+resourceArray[i]+"-qty").val();
		}		
	}

	// resources to receive
	for(var i = 0; i < resourceArray.length; i++)
	{
		if ($("#trade-recv-"+resourceArray[i]+"-qty").val() > 0)
		{
			_need[resourceArray[i]] = $("#trade-recv-"+resourceArray[i]+"-qty").val();
		}		
	}

	var tradeObj = {
		sender: username, 
		receiver: tradePartnerUsername, 
		need: _need,
		have: _have,
	};

	// this will call HandleTradeRequest function
	socket.emit("trade", tradeObj);
	
	$('#send-trade-request').attr('disabled', true);
	setTimeout(function() {$('#send-trade-request').removeAttr('disabled')}, 5000);

	alert('You have successfully sent a trade request to team ' + tradePartnerUsername + '!');
	$('#Modal').modal('hide');
}
///////////////////////////////////////////////////////////////////////////////////////trade


// called when a team got a trade request
function handleTradeRequest(data)
{
	console.log("Got Trade: " + data);
	
	var incomingCash = data.have.cash;
	var incomingFood = data.have.food;
	var incomingWater = data.have.water; 
	var incomingGas = data.have.gas;
	var incomingTreasure = data.have.treasure;

	var outgoingCash = data.need.cash;
	var outgoingFood = data.need.food;
	var outgoingWater = data.need.water; 
	var outgoingGas = data.need.gas;
	var outgoingTreasure = data.need.treasure; 

	//trader will give up 
	if (incomingCash != undefined){
		$('#trade-request-cash-incoming').val(incomingCash);
	}
	if (incomingFood != undefined){
		$('#trade-request-food-incoming').val(incomingFood);
		console.log("___incoming food display " + $('#trade-request-food-incoming').val());
	}
	if (incomingWater != undefined){
		$('#trade-request-water-incoming').val(incomingWater);
	}
	if (incomingGas != undefined){
		$('#trade-request-gas-incoming').val(incomingGas);
	}
	if (incomingTreasure != undefined){
		$('#trade-request-treasure-incoming').val(incomingTreasure);
	}

	//trader will receive
	if (outgoingCash != undefined){
		$('#trade-request-cash-outgoing').val(outgoingCash);
		console.log("___outgoing cash display " + $('#trade-request-cash-outgoing').val());
	}
	if (outgoingFood != undefined){
		$('#trade-request-food-outgoing').val(outgoingFood);
	}
	if (outgoingWater != undefined){
		$('#trade-request-water-outgoing').val(outgoingWater);
	}
	if (outgoingGas != undefined){
		$('#trade-request-gas-outgoing').val(outgoingGas);
	}
	if (outgoingTreasure != undefined){
		$('#trade-request-treasure-outgoing').val(outgoingTreasure);
	}
	
	$('#trade-request-current-cash').val($('#purchase-current-cash').val()); 
	$('#trade-request-current-food').val($('#current-food').val());
	$('#trade-request-current-water').val($('#current-water').val());
	$('#trade-request-current-gas').val($('#current-gas').val());
	$('#trade-request-current-treasure').val($('#trea-qty').val());

	$('#tradeIncomingModalTitle').html('Trade Request Incoming from ' + data.sender);
	$('#tradeIncomingModalTitle').val(data.sender);
	
	$('#tradeIncomingModal').modal({
		show: true,
		backdrop: 'static', 
		keyboard: false	
	});

}

function acceptTradeRequest()
{

	if(parseInt($('#trade-request-current-cash').val()) < parseInt($('#trade-request-cash-outgoing').val())){
		alert('You do not have the resources required to accept that trade request!');		
		return;
	}	
	if(parseInt($('#trade-request-current-food').val()) < parseInt($('#trade-request-food-outgoing').val())){
		alert('You do not have the resources required to accept that trade request!');		
		return;
	}
	if(parseInt($('#trade-request-current-water').val()) < parseInt($('#trade-request-water-outgoing').val())){
		alert('You do not have the resources required to accept that trade request!');		
		return;
	}
	if(parseInt($('#trade-request-current-gas').val()) < parseInt($('#trade-request-gas-outgoing').val())){
		alert('You do not have the resources required to accept that trade request!');		
		return;
	}
	if(parseInt($('#trade-request-current-treasure').val()) < parseInt($('#trade-request-treasure-outgoing').val())){
		alert('You do not have the resources required to accept that trade request!');		
		return;
	}

	console.log('accepted');
	var tradeObj = {};

	tradeObj.partner = $('#tradeIncomingModalTitle').val();	
	tradeObj.receive = {};
	tradeObj.give = {};

	// resources variables for the receiver team
	var updatedReceiverCash = 0;
	var updatedReceiverFood = 0;
	var updatedReceiverWater = 0;
	var updatedReceiverGas = 0;
	var updatedReceiverTreasure = 0;

// 	// resources variables for the trading team
// 	var updatedTraderCash = 0;
// 	var updatedTraderFood = 0;
// 	var updatedTraderWater = 0;
// 	var updatedTraderGas = 0;
// 	var updatedTraderTreasure = 0;

	//what accepting team receives from sending team
	if(parseInt($('#trade-request-cash-incoming').val()) > 0){
		tradeObj.receive.cash = parseInt($('#trade-request-cash-incoming').val());
		var currentCash = parseInt($('#current-cash').val());
		// update cash
		updatedReceiverCash = tradeObj.receive.cash + currentCash;

		$('#current-cash').val(updatedReceiverCash);
	}
	if(parseInt($('#trade-request-food-incoming').val()) > 0){
		tradeObj.receive.food = parseInt($('#trade-request-food-incoming').val());
		var currentFood = parseInt($('#current-food').val());
		// update food
		updatedReceiverFood = tradeObj.receive.food + currentFood;
		$('#current-food').val(updatedReceiverFood);
	}
	if(parseInt($('#trade-request-water-incoming').val()) > 0){
		tradeObj.receive.water = parseInt($('#trade-request-water-incoming').val());
		var currentWater = parseInt($('#current-water').val());
		// update water
		updatedReceiverWater = tradeObj.receive.water + currentWater;
		$('#current-water').val(updatedReceiverWater);
	}
	if(parseInt($('#trade-request-gas-incoming').val()) > 0){
		tradeObj.receive.gas = parseInt($('#trade-request-gas-incoming').val());
		var currentGas = parseInt($('#current-gas').val());
		// update gas
		updatedReceiverGas = tradeObj.receive.gas + currentGas;
		$('#current-gas').val(updatedReceiverGas);
	}
	if(parseInt($('#trade-request-treasure-incoming').val()) > 0){
		tradeObj.receive.treasure = parseInt($('#trade-request-treasure-incoming').val());
		var currentTreasure = parseInt($('#current-treasure').val());
		// update treasure
		updatedReceiverTreasure = tradeObj.receive.treasure + currentTreasure;
		$('#current-treasure').val(updatedReceiverTreasure);
	}

	// update storage
	$('#used-store').val(updatedReceiverFood + updatedReceiverWater + updatedReceiverGas + updatedReceiverTreasure);
	
	//what accepting team loses to trader team
	if(parseInt($('#trade-request-cash-outgoing').val()) > 0){
		tradeObj.give.cash = parseInt($('#trade-request-cash-outgoing').val());
		// update cash
		updatedReceiverCash =  parseInt($('#current-cash').val()) - tradeObj.give.cash;
		$('#current-cash').val(updatedReceiverCash);
	}
// 	// if(parseInt($('#trade-request-food-outgoing').val()) > 0){
// 	// 	tradeObj.give.food = parseInt($('#trade-request-food-outgoing').val());
// 	// 	// update food
// 	// 	updatedGiverFood = parseInt($('#current-food').val()) - tradeObj.give.food;
// 	// 	$('#current-food').val(updatedGiverFood);
// 	// }
// 	// if(parseInt($('#trade-request-water-outgoing').val()) > 0){
// 	// 	tradeObj.give.water = parseInt($('#trade-request-water-outgoing').val());
// 	// 	// upadte water
// 	// 	var updatedWater =  parseInt($('#current-water').val()) - tradeObj.give.water;
// 	// 	$('#current-water').val(updatedWater);
// 	// }
// 	// if(parseInt($('#trade-request-gas-outgoing').val()) > 0){
// 	// 	tradeObj.give.gas = parseInt($('#trade-request-gas-outgoing').val());
// 	// 	// update gas
// 	// 	var updatedGas =  parseInt($('#current-gas').val()) - tradeObj.give.gas;
// 	// 	$('#current-gas').val(updatedGas);
// 	// }
// 	// if(parseInt($('#trade-request-treasure-outgoing').val()) > 0){
// 	// 	tradeObj.give.treasure = parseInt($('#trade-request-treasure-outgoing').val());
// 	// 	// update treasure
// 	// 	var updatedTreasure =  parseInt($('#current-treasure').val()) - tradeObj.give.treasure;
// 	// 	$('#current-treasure').val(updatedTreasure);
// 	// }

	console.log("################################################" + 
		"\n UPDATED RESOURCES TO GIVE:\n CASH = " + tradeObj.give.cash + 
		"\n FOOD = " + updatedReceiverFood + 
		"\n WATER = " + updatedReceiverWater + 
		"\n GAS = " + updatedReceiverGas + 
		"\n TREASURE = " + updatedReceiverTreasure + 
		"\n ################################################");

// 	//create JSON object for the receiver team
	var sendData = { };

	sendData.submit_loc = $("#dest_select option:selected").text();
	sendData.submit_cash = updatedReceiverCash;
	sendData.submit_food = tradeObj.receive.food ;
	sendData.submit_water = tradeObj.receive.water;
	sendData.submit_gas = tradeObj.receive.gas;
	sendData.submit_treasure = tradeObj.receive.treasure;
	sendData.submit_storage = parseInt($("#used-store").val());
	
	sendData.submit_half_speed = global_half_speed;

// 	//also send session token for verification
	sendData.token = "<?PHP echo $_SESSION['user']['token']; ?>";
	sendData.days_out_of_fuel = days_out_of_fuel;

	//send to DB
	$.ajax({
		async: true,
		url: 'player_submit.php',
		type: 'POST',
		data: sendData,

		success: function(data) {
			//update player data
			//getPlayerData();
		},

		error: function(e) {
			console.log(e);
		}
	});

// 	/*$('#tradeIncomingModal').modal({
// 		show: false,
// 		backdrop: true, 
// 		keyboard: false	
// 	});*/

	$('#tradeIncomingModal').modal('hide');
	socket.emit('acceptedTrade', tradeObj);
}

function declineTradeRequest()
{
	console.log('decline');

	var tradeObj = {};
	tradeObj.partner = $('#tradeIncomingModalTitle').val();
	
	$('#tradeIncomingModal').modal('hide');
	
	socket.emit('declineTrade', tradeObj);
}

function counterTradeRequest()
{
	// console.log('counter');

	var tradeObj = {};
	tradeObj.partner = $('#tradeIncomingModalTitle').val();

	$('#tradeIncomingModal').modal('hide');

	//$('#Modal').modal('show'); 

	$('#trade-offer-cash-qty').val($('#trade-request-cash-outgoing').val());
	$('#trade-offer-food-qty').val($('#trade-request-food-outgoing').val());
	$('#trade-offer-water-qty').val($('#trade-request-water-outgoing').val());
	$('#trade-offer-gas-qty').val($('#trade-request-gas-outgoing').val());
	$('#trade-offer-treasure-qty').val($('#trade-request-treasure-outgoing').val());

	$('#trade-recv-cash-qty').val($('#trade-request-cash-incoming').val());
	$('#trade-recv-food-qty').val($('#trade-request-food-incoming').val());
	$('#trade-recv-water-qty').val($('#trade-request-water-incoming').val());
	$('#trade-recv-gas-qty').val($('#trade-request-gas-incoming').val());
	$('#trade-recv-treasure-qty').val($('#trade-request-treasure-incoming').val());
	//here is where you need to set the trade Partner to the player who you are countering 

	var teamListItems = $('#trade-partner-list li');
	teamListItems.each(function(li) {
		console.log($(this).html());
		console.log('That was a team name');
		if ($(this).html() == tradeObj.partner){ //matches innerHTML of list item 
			$(this).trigger('click');
		}		
	});

	socket.emit('counterTrade', tradeObj);

	$('#Modal').modal(
	{
		show: true,
		backdrop: true,
		keyboard: true
	});
}

function handleReceiveTrade(data)
{
	console.log('Accepted');
	
	// $('#Modal').modal('hide');

	// $('#tradeCounteredModal').modal({
	// 	show: true,
	// 	backdrop: true, 
	// 	keyboard: false	
	// });

	console.log("################################################" + 
	"\n UPDATED RESOURCES TO GIVE:\n CASH = " + $('#current-cash').val() + 
	"\n FOOD = " + $('#current-food').val() + 
	"\n WATER = " + $('#current-water').val() + 
	"\n GAS = " + $('#current-gas').val() + 
	"\n TREASURE = " + $('#current-treasure').val() + 
	"\n ################################################");
}

function handleDecline(data)
{
	console.log('Request declined!');
	
	$('#Modal').modal('hide');

	$('#tradeDeclinedModal').modal({
		show: true,
		backdrop: true, 
		keyboard: false	
	});
}

function handleCounter(data)
{
	console.log('Request declined but potentially being countered!');
	
	$('#Modal').modal('hide');

	$('#tradeCounteredModal').modal({
		show: true,
		backdrop: true, 
		keyboard: false	
	});
}

function handleAccept(data)
{
	console.log('Request accepted!');

	$('#Modal').modal('hide');

	$('#tradeAcceptedModal').modal({
		show: true,
		backdrop: true, 
		keyboard: false	
	});

	// pollPlayerData(true);
}

function resetTradeWindow(){ //simply resets trade values to 0 when trade window first opened
	$('#trade-offer-cash-qty').val("0");
	$('#trade-offer-food-qty').val("0");
	$('#trade-offer-water-qty').val("0");
	$('#trade-offer-gas-qty').val("0");
	$('#trade-offer-treasure-qty').val("0");

	$('#trade-recv-cash-qty').val("0");
	$('#trade-recv-food-qty').val("0");
	$('#trade-recv-water-qty').val("0");
	$('#trade-recv-gas-qty').val("0");
	$('#trade-recv-treasure-qty').val("0");
	
	
	//Update the badge
	unread_dm = 0;
	updateTradeBadge(unread_dm);
}
///////////////////////////////////////////////////////////////////////////////////////////
//chat functions
function handleConnection(){
	var connectedMsg = username + " is connected.";
	var messageObj = {username: username, grouping: userGrouping, msg: connectedMsg};
	console.log(connectedMsg);
	socket.emit("newClient", messageObj);
}

function handleNewMessage(messageObj){
	var data = messageObj.sender + ": " + messageObj.msg;
	//console.log("Got Message: " + data);
	var sender = messageObj.sender;
	var message = messageObj.msg;
	var receiver = messageObj.receiver;


	var msgHTML = "<span class=\"message\">" + data + "</span></br>";
	$("#chat-messages").append(msgHTML);
	$("#chat-panel").scrollTop($("#chat-panel")[0].scrollHeight);

	//play the sound
	if(data.substring(0, 7) != "Server:" && !messageObj.resend){
		
		msgSound.play();

	}

}

function addToChatLog(day, text)
{
	var msgHTML = "<span class=\"message green\">Day " + day+ ": " + text + "</span></br>";
	$("#chat-messages").append(msgHTML);
	$("#chat-panel").scrollTop($("#chat-panel")[0].scrollHeight);
}

function handleNewMessageTrade(messageObj){
	var data = messageObj.sender + ": " + messageObj.msg;
	if(!$("#Modal").is(":visible"))
	{
		unread_dm++;
		updateTradeBadge(unread_dm);
	}
	//console.log("Got Message direct: " + data);
	dmLog.push(messageObj);
	var sender = messageObj.sender;
	var message = messageObj.msg;
	var receiver = messageObj.receiver;
	var chattingWith = $("#trade-partner-list").find(".active").first().text();
	//console.log("chatting with:" + chattingWith);
	if (sender == chattingWith || sender == username) {
		var msgHTML = "<span class=\"message\">" + data + "</span></br>";
		$("#chat-messages-trade").append(msgHTML);
		$("#chat-panel-trade").scrollTop($("#chat-panel-trade")[0].scrollHeight);

		//play the sound
		msgSound.play();

	}
}

function updateTradeBadge(num)
{
	num = num || 0;
	if(num == 0)
	{
		$("#trade-badge").removeClass('badge');
		$("#trade-badge").text("");
	}
	else
	{
		$("#trade-badge").addClass('badge');
		$("#trade-badge").text(num);
	}
}

function sendChatMessage(){
	var chatInput = $("#chat-message-input"); 
	var message = chatInput.val();
	var receiver = "All";
	var messageType = (receiver == "All")? "broadcast":"direct";
	var messageObj = {msg: message, grouping: userGrouping, sender: username, receiver: receiver, type: messageType};
	if(chatInput.val() != "")
	{
		socket.emit("message", messageObj);
	}
	
	chatInput.val("");
}

function sendChatMessageTrade(){
	var chatInput = $("#chat-message-input-trade"); 
	var message = chatInput.val();
	var receiver = document.getElementsByClassName("list-group-item active")[0].innerText;
	var messageType = "direct";
	var messageObj = {msg: message, grouping: userGrouping, sender: username, receiver: receiver, type: messageType};
	if(chatInput.val() != "")
	{
		socket.emit("message", messageObj);
	}
	
	chatInput.val("");
}

function handleSOS(data){
	//console.log("Got Message2: " + data.msg);
	var msgHTML = '<font color = \"red\">' + data.msg + '</font></br>';
	$("#chat-messages").append(msgHTML);
	$("#chat-panel").scrollTop($("#chat-panel")[0].scrollHeight);

	//play alert sound
	if(!data.resend)
	{
		alertSound.play();
	}

}

function sendSOSMessage(){
	//disable SOS button for 1 minute
	$('#sos-button').attr('disabled', true);
	setTimeout(function() {$('#sos-button').removeAttr('disabled')}, 60000);
	
	var loc = $('#current-loc').val();
	var food = parseInt($("#current-food").val()) < 3 ? 'Food! ' : '';
	var water = parseInt($("#current-water").val()) < 3 ? 'Water! ' : '';
	var gas = parseInt($("#current-gas").val()) < 3 ? 'Gas!' : '';
	var message = username + ': SOS!' + 
		'<br>' + username + ': SOS! From ' + loc +
		'<br>' + username + ': SOS! Need ' +food + water + gas +
		'<br>' + username + ': SOS!';
	socket.emit("sos", {msg: message, grouping: userGrouping});
}

function initPartners(idx,li) {
	var aPartnerName  = $(li).text();
   	var aPartner = new partner(aPartnerName, true);
   	allPartners.push(aPartner);
}


function handleClickTradeParter(e) {
	e.preventDefault()

    // Find the trade partner, update and save its state before switching to new partner
    var tradePartner = $("#trade-partner-list").find(".active").first().text();
    var prevPartner = new partner(tradePartner, false);
    for (var i = 0; i < allPartners.length; i++) {
		if (tradePartner == allPartners[i].partnerName) {
			allPartners.splice(i,1);
		}
	}
	allPartners.push(prevPartner);

	//console.log("Saved previous partner: " + prevPartner.partnerName);
    
    $that = $(this);
    
    $that.parent().find('li').removeClass('active');
    $that.addClass('active');
    var sb = $(this).text();

    document.getElementById("chat-messages-trade").innerHTML = "";
	for (var i = 0; i < dmLog.length; i++) {
		if (dmLog[i] && (dmLog[i].sender == sb || dmLog[i].receiver == sb)) {
			//console.log(dmLog[i].sender + ": "+ dmLog[i].msg);
			var data = dmLog[i].sender + ": "+ dmLog[i].msg;
			var msgHTML = "<span class=\"message\">" + data + "</span></br>";
			$("#chat-messages-trade").append(msgHTML);
			$("#chat-panel-trade").scrollTop($("#chat-panel-trade")[0].scrollHeight);
		}
	}
	

    $("#trading-with-txt").text("Trading with " + sb); 
    $("#trading-with-txt").val("Trading with " + sb);
     $("#chat-with-txt").text("Chat with " + sb); 
    $("#chat-with-txt").val("Chat with " + sb);

    // console.log(sb);

    // Pull information and update label for new trade partner
    var newPartner;
    var find = false;
    for (var i = 0; i < allPartners.length; i++) {
		if (sb == allPartners[i].partnerName) {
			newPartner = allPartners[i];
			find = true;
		}
	}
	if (!find) {
		newPartner = new partner(ab,true);
	}
	$("#trade-offer-cash-qty").val(newPartner.cashOffer);
	$("#trade-offer-food-qty").val(newPartner.foodOffer);
	$("#trade-offer-water-qty").val(newPartner.waterOffer);
	$("#trade-offer-gas-qty").val(newPartner.gasOffer);
	$("#trade-offer-treasure-qty").val(newPartner.treasureOffer);

	$("#trade-offer-cash-qty").text(newPartner.cashOffer);
	$("#trade-offer-food-qty").text(newPartner.foodOffer);
	$("#trade-offer-water-qty").text(newPartner.waterOffer);
	$("#trade-offer-gas-qty").text(newPartner.gasOffer);
	$("#trade-offer-treasure-qty").text(newPartner.treasureOffer);

	$("#trade-recv-cash-qty").val(newPartner.cashRecv);
	$("#trade-recv-food-qty").val(newPartner.foodRecv);
	$("#trade-recv-water-qty").val(newPartner.waterRecv);
	$("#trade-recv-gas-qty").val(newPartner.gasRecv);
	$("#trade-recv-treasure-qty").val(newPartner.treasureRecv);	

	$("#trade-recv-cash-qty").text(newPartner.cashRecv);
	$("#trade-recv-food-qty").text(newPartner.foodRecv);
	$("#trade-recv-water-qty").text(newPartner.waterRecv);
	$("#trade-recv-gas-qty").text(newPartner.gasRecv);
	$("#trade-recv-treasure-qty").text(newPartner.treasureRecv);

	console.log("Pulled out info for new partner: " + newPartner.partnerName);
}


function updateTradeButton() {
	var count = $("#trade-partner-list li").length;
    // console.log("Count: " + count);
    if (count == 0 ) {
    	$("#trade-btn").prop('disabled',true);
    } else {
    	$("#trade-btn").prop('disabled',false);
    }
}

//increases by one unit and subtracts cost from cash
function buy(price_id, qty_id) {
	var qty = parseInt($('#' + qty_id).val());
	var temp = $('#' + price_id).html().split('/');
	var price = parseInt(temp[0]);
	var cash = parseInt($('#purchase-current-cash').val());

	//to find out if ship is overcapacity
	var total_onhand = parseInt($("#current-food").val()) + parseInt($("#current-water").val()) + parseInt($("#current-gas").val());
	var total_now = parseInt($("#food-qty").val()) + parseInt($("#water-qty").val()) + parseInt($("#gas-qty").val());
	var total = total_onhand + total_now;            

	if(price > cash) { 
		//do nothing
	} 
	else if(total >= 30) {
		//if ship is over capacity, do nothing as well
	}
	else {
		cash -= price;
		$('#' + qty_id).val(qty + 1);
		//$('#cash').val(cash);
		//console.log("cash"+ cash);
		$('#purchase-current-cash').val(cash);
		//console.log($('#purchase-current-cash').val());
		//show ship capacity
		$("#used-store").val(total + 1);
		$("#purchase-current-store").val($("#used-store").val());
	}
}
//decreases by one unit and adds back cost to cash
function sell(price_id, qty_id) {
	var qty = parseInt($('#' + qty_id).val());
	var temp = $('#' + price_id).html().split('/');
	var price = parseInt(temp[0]);
	var cash = parseInt($('#purchase-current-cash').val());

	//to find out if ship is overcapacity
	var total_onhand = parseInt($("#current-food").val()) + parseInt($("#current-water").val()) + parseInt($("#current-gas").val());
	var total_now = parseInt($("#food-qty").val()) + parseInt($("#water-qty").val()) + parseInt($("#gas-qty").val());
	var total = total_onhand + total_now; 

	if(qty <= 0) {
		//do nothing
	}
	else {
		cash += price;
		$('#' + qty_id).val(qty - 1);
		//$('#cash').val(cash);
		$('#purchase-current-cash').val(cash);
		//show ship capacity
		$("#used-store").val(total - 1);
		$("#purchase-current-store").val($("#used-store").val());

	}
}
//helper function for Timeline: takes in day (-3 to 14)
//moves progress by increments of 5.55
function timeline(day) {
	var counter = 1;
	for(i = -3; i <= day; i++) {
		var temp = 5.26 * counter;
		//move planning period bar from day -3 to 0
		if(i <= 0) {
			$('#timeline-planning').attr('aria-valuenow', temp);
			$('#timeline-planning').css('width', temp+'%');
			//reset counter after day 0
			if(i == 0) {
				counter = 1;
			}
		} 
		//move day bar after
		else {
			$('#timeline-day').removeAttr('hidden');
			$('#timeline-day').attr('aria-valuenow', temp);
			$('#timeline-day').css('width', temp+'%');
			$('#timeline-day').html('Day ' + day);
		}
		counter++;
	}
}
//SPEED HANDLING
//takes in speed and displays to user
//we add one to all the global speeds because we have to call this function after speedHelper, which subtracts one
function speedNotice(speed_num, destination) {
	if(speed_num == 1) {
		$("#current-speed").val('Normal Speed');
		$('#current-speed').css('background-color','rgba(136,193,73,0.5)');
		$("#current-speed-tooltip").attr("data-original-title", "Full Speed Ahead!");
		//$("#alert-insert").prepend('<div class="alert alert-success alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-tachometer"></i><strong> Full Speed Ahead!</strong></div>');
	}
	if(speed_num == 0.5) {
		$("#current-speed").val('Half Speed');
		$('#current-speed').css('background-color','rgba(225,207,7,0.5)');
		//Did speedHelper subtract one? If not then remove one added.
		var temp_day = global_half_speed + 1;
		if(global_half_speed == 2) {
			temp_day -= 1;
		}
		$("#current-speed-tooptip").attr("data-original-title", "You are out of food/water, and traveling at half speed.");

		//Alert for when they are delayed
		if($('#current-loc').val() == 'At Sea') {
			$("#current-speed-tooptip").attr("data-original-title", "You are out of food/water, and traveling at half speed. You are " + temp_day + " Day(s) from " + destination + ".");
			//$("#alert-insert").prepend('<div class="alert alert-warning alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-tachometer"><strong> Speed Warning! </strong>You are out of food/water, and traveling at half speed. You are <strong>' + temp_day + ' Day(s) </strong>from <strong>' + destination + '</strong>.</div>');
		}
		//Alert for when they arrive
		if(temp_day == 2) {
			$("#current-speed-tooltip").attr("data-original-title", "You are out of food/water, and will travel at half speed beginning tomorrow.");
			//$("#alert-insert").prepend('<div class="alert alert-warning alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-tachometer"><strong> Speed Warning! </strong>You are out of food/water, and will travel at half speed beginning tomorrow.</div>');                    
		}
	}
	// if(speed_num == 0.25) {
	// 	$("#current-speed").val('Quarter Speed');
	// 	$('#current-speed').css('background-color','rgba(225,102,7,0.5)');
	// 	//Did speedHelper subtract one? If not then remove one added.
	// 	var temp_day = global_qtr_speed + 1;
	// 	if(global_qtr_speed == 4) {
	// 		temp_day -= 1;
	// 	}
	// 	$("#current-speed-tooptip").attr("data-original-title", "You are out of food and water, and traveling at quarter speed.");

	// 	if($('#current-loc').val() == 'At Sea') {
	// 		$("#current-speed-tooptip").attr("data-original-title", "You are out of food and water, and traveling at quarter speed. You are " + temp_day + " Day(s) from " + destination + ".");
	// 		//$("#alert-insert").prepend('<div class="alert alert-danger alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-tachometer"><strong> Speed Warning! </strong>You are out of food and water, and traveling at quarter speed. You are <strong>' + temp_day + ' Day(s) </strong>from <strong>' + destination + '</strong>.</div>');
	// 	}

	// 	if(temp_day == 4) {
	// 		$("#current-speed-tooltip").attr("data-original-title", "You are out of food and water, and will travel at quarter speed beginning tomorrow.");
	// 		//$("#alert-insert").prepend('<div class="alert alert-danger alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-tachometer"><strong> Speed Warning! </strong>You are out of food and water, and will travel at quarter speed beginning tomorrow.</div>');                    
	// 	}
	// }
}

//update speed values and disable destination select to simulate longer travel times
function speedHelper(speed_num) {
	//Half-Speed
	if(speed_num == 0.5) {
		//when half_speed is at zero (user is at destination) reset to 2
		if(global_half_speed == 0) {
			global_half_speed = 2;
			//global_qtr_speed = 4;
		}
		if(global_half_speed == 1) {
			//Disable Destination Selection to simulate longer travel time
			$("#dest_select").prop('disabled', true);
			$("#current-loc").val('At Sea');
			//marker
			//Disable everything
			$('#food-price').html('N/A');
			$('#water-price').html('N/A');
			$('#gas-price').html('N/A');
			$('#trea-price').html("N/A");

			$("#food-minus").prop('disabled',true);
			$("#food-plus").prop('disabled',true);
			$("#water-minus").prop('disabled',true);
			$("#water-plus").prop('disabled',true);                            
			$("#gas-minus").prop('disabled',true);
			$("#gas-plus").prop('disabled',true);
			$("#trea-btn").prop('disabled',true);

			global_half_speed -= 1; 
			//global_qtr_speed -= 1;                        
		}
		if(global_half_speed == 2) {
			global_half_speed -= 1;
			//global_qtr_speed -= 1;
		}
	}
	//Qtr-Speed
	// if(speed_num == 0.25) {
	// 	//when qtr_speed is at zero (user is at destination) reset to 4
	// 	if(global_qtr_speed == 0) {
	// 		global_half_speed = 2;
	// 		global_qtr_speed = 4;
	// 	}
	// 	if((global_qtr_speed == 1) || (global_qtr_speed == 2) || (global_qtr_speed == 3)) {
	// 		//Disable Destination Selection to simulate longer travel time
	// 		$("#dest_select").prop('disabled', true);
	// 		$("#current-loc").val('At Sea');

	// 		//Disable everything
	// 		$('#food-price').html('N/A');
	// 		$('#water-price').html('N/A');
	// 		$('#gas-price').html('N/A');
	// 		$('#trea-price').html("N/A");

	// 		$("#food-minus").prop('disabled',true);
	// 		$("#food-plus").prop('disabled',true);
	// 		$("#water-minus").prop('disabled',true);
	// 		$("#water-plus").prop('disabled',true);                            
	// 		$("#gas-minus").prop('disabled',true);
	// 		$("#gas-plus").prop('disabled',true);
	// 		$("#trea-btn").prop('disabled',true);

	// 		if(global_qtr_speed == global_half_speed) {
	// 			global_half_speed -= 1;
	// 		}
	// 		global_qtr_speed -= 1;                       
	// 	}
	// 	if(global_qtr_speed == 4) {
	// 		global_qtr_speed -= 1;
	// 	}
	// }
	//Full-Speed: reset values
	if(speed_num == 1) {
		global_half_speed = 2;
		//global_qtr_speed = 4;
	}
}
//********************************************************************
//Display Sea Captain info to players once, then disable button again
//Player can choose to see the weather or pirate information
function captWeather(isReplay) {

	var isReplay = isReplay || false;

	var info = "The weather this time of year is like clock work. It rains for two days and then it's sunny for 3 days. " + 
		   "It rained on days -5 and -4, it's sunny on days -3, -2, and -1, and it's raining on day 1 and 2 and so on. " + 
		   "This is how the Crusty Old Sea Captain knew that he would be home precisely on day one.";

	// Display the modal with info and random video
	$("#captainmessage").val(info);
	$("#captainmessage").text(info);

	$("#captainaudio").hide();
	$("#captainvideo").hide();
	<?php
		$filebase = "seacaptain-weather";
		$files = glob("media/$filebase.*");
		$file;
		$ext;
		foreach ($files as $f)
		{
			$file = $f;
			$info = pathinfo($f);
			$ext = $info["extension"];
		}
	?>
	<?php
		if(isset($file))
		{
			if($ext == "mp3")
			{
	?>
				$("#captainaudio").attr('src', "<?=$file?>");
				$("#captainaudio").load();
				$("#captainaudio").show();
				$("#captainMessageModal").modal();
				$("#captainaudio").get(0).play();
			
	<?php
			}
			else if($ext == "mp4")
			{
	?>
				$("#captainvideo").attr('src', "<?=$file?>");
				$("#captainvideo").load();
				$("#captainvideo").show();
				$("#captainMessageModal").modal();
				$("#captainvideo").get(0).play();
	<?php
			}
		}
	?>


	if(!isReplay)
	{
		//Display info as an alert
		//$("#alert-insert").prepend('<div class="alert alert-success alert-dismissible fade in" role="alert" id="bar"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>Ahoy mates!</strong> ' + info + '</div>');            
		
		//Disable button
		$("#sea-captain").prop('disabled',true);
		$("#sea-captain").removeClass('btn btn-success btn-block dropdown-toggle');
		$("#sea-captain").addClass('btn btn-danger btn-block dropdown-toggle');
		$("#sea-captain").html('Old Sea Captain is not here... <span class="caret"></span>');

		//disable select menu and change destination to current
		$("#dest_select").prop('disabled', true);
		$("#dest_select").val(0).prop('selected', true);  
		
		$("#weather-replay").show();
	}
         
}
function captPirate(isReplay) {
	var isReplay = isReplay || false;
	var info = "Pirates are based on Bruin Island. They will only attack ships that are traveling on open water within 2 days travel of Bruin Island. " + 
		   "Also, they never attack ships that are on their way from Trojan Island to the treasure spot (waste of time), but they will definitely " + 
		   "attack a ship that is heading home from the treasure spot to Trojan Island.";

    // Display the modal with info and random video
	$("#captainmessage").val(info);
	$("#captainmessage").text(info);

	$("#captainaudio").hide();
	$("#captainvideo").hide();
	<?php
		$filebase = "seacaptain-pirates";
		$files = glob("media/$filebase.*");
		$file;
		$ext;
		foreach ($files as $f)
		{
			$file = $f;
			$info = pathinfo($f);
			$ext = $info["extension"];
		}
	?>
	<?php
		if(isset($file))
		{
			if($ext == "mp3")
			{
	?>
				$("#captainaudio").attr('src', "<?=$file?>");
				$("#captainaudio").load();
				$("#captainaudio").show();
				$("#captainMessageModal").modal();
				$("#captainaudio").get(0).play();
			
	<?php
			}
			else if($ext == "mp4")
			{
	?>
				$("#captainvideo").attr('src', "<?=$file?>");
				$("#captainvideo").load();
				$("#captainvideo").show();
				$("#captainMessageModal").modal();
				$("#captainvideo").get(0).play();
	<?php
			}
		}
	?>
	

	
	if(!isReplay)
	{
		//Display info as an alert
		//$("#alert-insert").prepend('<div class="alert alert-success alert-dismissible fade in" role="alert" id="bar"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><strong>Ahoy mates!</strong> ' + info + '</div>');            
		
		//Disable button
		$("#sea-captain").prop('disabled',true);
		$("#sea-captain").removeClass('btn btn-success btn-block dropdown-toggle');
		$("#sea-captain").addClass('btn btn-danger btn-block dropdown-toggle');
		$("#sea-captain").html('Old Sea Captain is not here... <span class="caret"></span>');

		//disable select menu and change destination to current
		$("#dest_select").prop('disabled', true);
		$("#dest_select").val(0).prop('selected', true);    
		$("#pirate-replay").show();
	}
       
}
//helper function: called when user sells treasure
//updates user table 'sold_at_trojan' for treasure island to 1 (See player_treasure.php)
function treasureSell(price_id, qty_id) {
	var qty = parseInt($('#' + qty_id).val());
	var temp = $('#' + price_id).html().split('/');
	var price = parseInt(temp[0]);
	var cash = parseInt($('#purchase-current-cash').val());

	//to find out if ship is overcapacity
	var total_onhand = parseInt($("#current-food").val()) + parseInt($("#current-water").val()) + parseInt($("#current-gas").val());
	var total_now = parseInt($("#food-qty").val()) + parseInt($("#water-qty").val()) + parseInt($("#gas-qty").val());
	var total = total_onhand + total_now; 

	if(qty <= 0) {
		//do nothing
	}
	else {
		cash += price;
		$('#' + qty_id).val(qty - 1);
		$('#trea-qty').val(qty - 1);
		$('#purchase-current-cash').val(cash);
	}

	//call DB
	$.ajax({
		url: 'player_treasure.php',
		type: 'POST',
		data: {'token' : "<?PHP echo $_SESSION['user']['token']; ?>"},

		success: function(data) {
			//do nothing
		},

		error: function(e) {
			console.log(e);
		}
	});
}
//helper function that update DB with pirate loses
function pirateAttack(isBaseAttack) {
	$.ajax({
		url: 'player_pirates.php',
		type: 'POST',
		data: {'token' : "<?PHP echo $_SESSION['user']['token']; ?>"},

		success: function(data) {
			//reload data
			pollPlayerData(true);

			//alert user of the attack
			// alert for pirate-all
			if(isBaseAttack)
			{
				$("#pirateMessage").text("Unfortunately, you have landed on the Pirates' hideout.  They steal half your food and gas, leaving you your ship and your lives.");
				addToChatLog(allData['day'], "Unfortunately, you have landed on the Pirates' hideout.  They steal half your food and gas, leaving you your ship and your lives.");
				loadMultiMedia("bruin-island-pirate", "pirate");
			}
			else
			{
				$("#pirateMessage").text("Pirates have ATTACKED!!!  They have stolen all your Treasure and half of your food and gas.");
				loadMultiMedia("pirate-attack", "pirate");
				addToChatLog(allData['day'], "Pirates have ATTACKED!!!  They have stolen all your Treasure and half of your food and gas.");
			}
			
		
			$("#pirateAttackModal").modal();
			
			//eventAlert(false, false, false, true, false);
			//$("#alert-insert").prepend('<div class="alert alert-danger alert-dismissible fade in" role="alert"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-exclamation"></i><strong> Pirate Attack! </strong>' + msg + '</div>');
			
		},

		error: function(e) {
			console.log(e);
		}
	});            
}
//PLAYER SAVE: Get all teams in group and their gas info
function deadPlayerResponse() {
	//Reset Modal Elements
	$("#team_select").html('');//death-warning

	$("#gas_select").html('');
	$("#modal-error").html('');
	$("#auth-code").val('');
	//*************************************
	xmlhttp = new XMLHttpRequest();
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			//Receive an associative array in JSON from DB
			var userData = JSON.parse(xmlhttp.responseText);

			//display teams and gas available within modal
			for(i = 0; i < userData.length; i++) {
				//teams
				$("#team_select").append('<option ' + 'value=' + '"' + userData[i]['username'] + '">' + userData[i]['username'] + '</option>');
			}
			//display gas availiblity for first team
			for(i = 0; i <= userData[0]['gas']; i++) {
				$("#gas_select").append('<option ' + 'value=' + '"' + i + '">' + i + '</option>');
			}                    

			//given the player selected, display the amount of fuel they have in ascending order
			$("#team_select").change(function() {
				//clear element
				$("#gas_select").html('');                        
				for(i = 0; i < userData.length; i++) {
					//find selected player, and display their gas only
					if($("#team_select").val() == userData[i]['username']) {
						for(j = 0; j <= userData[i]['gas']; j++) {
							$("#gas_select").append('<option ' + 'value=' + '"' + j + '">' + j + '</option>');
						}
					}
				}
			});                 
		}
	}
	xmlhttp.open("GET","player_dead_response.php?token="+"<?PHP echo $_SESSION['user']['token']; ?>",true);
	xmlhttp.send();          
}

//PLAYER SAVE: Submit which team donated and how much
function deadPlayerSubmit() {
	//gather data
	var sendData = { };

	sendData.submit_authcode = $('#auth-code').val();
	sendData.submit_username = $("#team_select option:selected").text();
	sendData.submit_donation = parseInt($("#gas_select option:selected").text());

	//also send session token for verification
	sendData.token = "<?PHP echo $_SESSION['user']['token']; ?>";

	//send to DB
	$.ajax({
		url: 'player_dead_submit.php',
		type: 'POST',
		data: sendData,

		success: function(data) {
			//alert user if authcode is wrong
			$('#modal-error').html(data);

			//update player data after 3 seconds
			setTimeout(function() {
				getPlayerData();
			}, 3000);
		},

		error: function(e) {
			console.log(e);
		}
	});                        
}        
//helper function that sends data to DB and disables go button after one click
function goButton() {
	//create JSON object
	var sendData = { };

	sendData.submit_loc = $("#dest_select option:selected").text();
	sendData.submit_cash = parseInt($("#purchase-current-cash").val());
	sendData.submit_food = order_food;
	sendData.submit_water = order_water;
	sendData.submit_gas = order_gas;
	sendData.submit_treasure = parseInt($("#trea-qty").val());
	sendData.submit_storage = parseInt($("#used-store").val());
	
	sendData.submit_half_speed = global_half_speed;
	//sendData.submit_qtr_speed = global_qtr_speed;

	//also send session token for verification
	sendData.token = "<?PHP echo $_SESSION['user']['token']; ?>";

	//also send resource use
	//no resource use on Trojan Island
	if((sendData.submit_loc == 'Trojan Island') && ($('#current-loc').val() != 'At Sea')) {
		food_used = 0;
		water_used = 0;
		gas_used = 0;
	}
	//If you don't travel, then no gas is used
	//value of current location in select menu is 0
	if(($('#dest_select').val() == 0) && ($('#current-loc').val() != 'At Sea')) {
		gas_used = 0;
	}           
	sendData.food_used = food_used;
	sendData.water_used = water_used;
	sendData.gas_used = gas_used;

	//Are you staying at the same place?
	if($("#current-loc").val() == $("#dest_select option:selected").text()) {
		same_place = 1;
	} else {
		same_place = 0;
	}
	//reset order
	order_food = 0;
	order_gas = 0;
	order_water = 0;
	
	sendData.days_out_of_fuel = days_out_of_fuel;

	//send to DB
	$.ajax({
		async: true,
		url: 'player_submit.php',
		type: 'POST',
		data: sendData,

		success: function(data) {
			//change and disable button
			$("#go-btn").prop('disabled',true);
			$("#go-btn").removeClass('btn btn-success btn-block');
			$("#go-btn").addClass('btn btn-danger btn-block');
			$("#go-btn").html('Waiting for Facilitator...');
			$("#go-btn-tooltip").attr('data-original-title', 'Carefully consider your decisions. The button will turn green when you are able to advance.');

			//update player data
			getPlayerData();
		},

		error: function(e) {
			//change and disable button
			$("#go-btn").prop('disabled',true);
			$("#go-btn").removeClass('btn btn-success btn-block');
			$("#go-btn").addClass('btn btn-danger btn-block');
			$("#go-btn").html('Send Error... Please Refresh.');
			$("#go-btn-tooltip").attr('data-original-title', '');

			console.log(e);
		}
	});
}
//Get Player Data from database and Display in UI
function getPlayerData() {
	console.log("IN GET PLAYER DATA");
	//Reset some elements to their default state
	//Disable all resource and treasure buttons
	$("#food-minus").prop('disabled',true);
	$("#food-plus").prop('disabled',true);
	$("#water-minus").prop('disabled',true);
	$("#water-plus").prop('disabled',true);
	$("#gas-minus").prop('disabled',true);
	$("#gas-plus").prop('disabled',true);
	$("#trea-btn").prop('disabled',true);
	$("#sos-button").prop('disabled',true);
	$('#treasure-group').attr('data-original-title', '');

	//Set all resource counters to zero
	$("#food-qty").val(0);
	$("#water-qty").val(0);
	$("#gas-qty").val(0);

	//Enable Destination Selection
	$("#dest_select").removeAttr('disabled');

	//Disable Old Sea Captain
	$("#sea-captain").prop('disabled',true);
	$("#sea-captain").removeClass('btn btn-success btn-block dropdown-toggle');
	$("#sea-captain").addClass('btn btn-danger btn-block dropdown-toggle');
	$("#sea-captain").html('Old Sea Captain is not here... <span class="caret"></span>');

	//Resource used back to 1
	food_used = 1;
	water_used = 1;
	gas_used = 1;

	//clear all alerts from previous day
	// $("#alert-insert").html('');

	//Remove modal alert by default
	// $('#myModal-dead').hide();                            
	pollPlayerData();
}

function getMedia(filebase)
{
	var xmlHttp = new XMLHttpRequest();
	xmlHttp.open( "GET", "get_media_asset.php?filebase="+filebase, false ); // false for synchronous request
	xmlHttp.send( null );
	var retJSON = JSON.parse(xmlHttp.responseText);
	
	if(!retJSON.success)
	{
		return false;
	}
	return retJSON;
}

function isIsland(location)
{
	var islands = 
	{
		"Trojan Island":true,
		"Bear Island":true,
		"Duck Island":true,
		"Cardinal Island":true,
		"Sun Devil Island":true,
		"Bruin Island":true
	}
	
	if(islands[location])
	{
		return true;
	}
	return false;
}

function loadMultiMedia(filebase, divIdBase)
{
	console.log("Load MultiMedia: " + filebase + " " + "#" + divIdBase);
	var didLoad = false;
	var video = false;
	var fileInfo;
	
	var fileInfo = getMedia(filebase);
	var audioID = "#" + divIdBase + "Audio";
	var videoID = "#" + divIdBase + "Video";
	
	if(fileInfo == false) // no media, hide both and return
	{
		$(videoID).hide();
		$(audioID).hide();
		return false;
	}
	
	if(fileInfo.filename)
	{
		if(fileInfo.ext == "mp3")
		{
			$("#" + divIdBase + "Audio").attr('src', fileInfo.filename);
			didLoad = true;
		}
		else if(fileInfo.ext == "mp4")
		{
			$("#" + divIdBase + "Video").attr('src', fileInfo.filename);
			didLoad = true;
			video = true;
		}

	}

	if(didLoad)
	{
		if(video)
		{
			$(videoID).load();
			$(videoID).show();
			$(audioID).hide();
			return "Video";
		}
		else
		{
			$(audioID).load();
			$(audioID).show();
			$(videoID).hide();
			return "Audio";
		}

	}
	

}

function pollPlayerData(resourcesOnly)
{
	//default to false
	resourcesOnly = resourcesOnly || false;
		//****************************************
	if (window.XMLHttpRequest) {
		//For IE7+, Firefox, Chrome, Opera, Safari
		xmlhttp = new XMLHttpRequest();
	} else {
		//For IE6, IE5
		xmlhttp = new ActiveXObject("Microsoft.XMLHTTP");
	}

	var dead = false;

	//Do something with data when server is ready
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

			//Receive an associative array in JSON from DB
			allData = JSON.parse(xmlhttp.responseText);
			$(".eventAlert").hide();

			//END OF SIMULATION: If day 15, then disable all entry and show modal
			if(allData['day'] == 15) {
				//Disable all resource and treasure buttons Regardless of Location
				$("#food-minus").prop('disabled',true);
				$("#food-plus").prop('disabled',true);
				$("#water-minus").prop('disabled',true);
				$("#water-plus").prop('disabled',true);
				$("#gas-minus").prop('disabled',true);
				$("#gas-plus").prop('disabled',true);
				$("#trea-btn").prop('disabled',true);

				//Disable Destination Selection (Enabled by default)
				$("#dest_select").prop('disabled', true);

				//Disable Sea Captain Regardless of Location
				$("#sea-captain").prop('disabled', true);

				//Show modal alert to user
				$('#myModal').modal('show');   
				return;
			}

			days_out_of_fuel = allData['days_out_of_fuel'];
		
			//Display userData
			$("#current-loc").val(allData['current_loc']);
			

			if (allData['cash'] > 0)
			{
				$("#current-cash").val(allData['cash']);
			}
			else
			{
				$("#current-cash").val('0');
			}

			$("#current-food").val(allData['food']);
			$("#current-water").val(allData['water']);
			$("#current-gas").val(allData['gas']);
			$("#trea-qty").val(allData['treasure']);
			$("#used-store").val(allData['storage']);
			
			//update purchase window values
			$("#purchase-current-cash").val(allData['cash']);
			if (allData['cash'] > 0)
			{
				$("#purchase-current-cash").val(allData['cash']);
			}
			else
			{
				$("#purchase-current-cash").val('0');
			}
			$("#purchase-current-food").val(allData['food']);
			$("#purchase-current-water").val(allData['water']);
			$("#purchase-current-gas").val(allData['gas']);
			$("#purchase-current-treasure").val(allData['treasure']);
			$("#purchase-current-store").val(allData['storage']);


			//update trade window values
			$("#trade-current-cash").val(allData['cash']);
			$("#trade-current-food").val(allData['food']);
			$("#trade-current-water").val(allData['water']);
			$("#trade-current-gas").val(allData['gas']);
			$("#trade-current-treasure").val(allData['treasure']);

			if(!resourcesOnly)
			{
				timeline(allData['day']);
				global_half_speed = allData['half_speed'];
				//global_qtr_speed = allData['qtr_speed'];

				//Display islandData

				//If resources are not for sale here (-1), disable buttons and show "N/A"
				//Otherwise, change the prices for the Island

				//Food
				if((allData['current_loc'] == 'SD1') || (allData['current_loc'] == 'SD2') 
						|| (allData['current_loc'] == 'SD3') || (allData['current_loc'] == 'SD4') 
						|| (allData['current_loc'] == 'SD5') || (allData['current_loc'] == 'SD6') 
						|| (allData['current_loc'] == 'T1') || (allData['current_loc'] == 'T2') 
						|| (allData['current_loc'] == 'B1') || (allData['current_loc'] == 'B2')
						|| (allData['current_loc'] == 'Treasure Spot')) 
				{ // if (allData['i_food'] == -1) {
					$("#food-minus").prop('disabled',true);
					$("#food-plus").prop('disabled',true);

					$('#food-price').html('N/A');
				} else {
					$('#food-price').html(allData['i_food'] + '/unit');
					//reenable button
					$("#food-minus").removeAttr('disabled');
					$("#food-plus").removeAttr('disabled');
				}


				//Water
				if((allData['current_loc'] == 'SD1') || (allData['current_loc'] == 'SD2') 
						|| (allData['current_loc'] == 'SD3') || (allData['current_loc'] == 'SD4') 
						|| (allData['current_loc'] == 'SD5') || (allData['current_loc'] == 'SD6') 
						|| (allData['current_loc'] == 'T1') || (allData['current_loc'] == 'T2') 
						|| (allData['current_loc'] == 'B1') || (allData['current_loc'] == 'B2')
						|| (allData['current_loc'] == 'Treasure Spot'))
				{//if(allData['i_water'] == -1) {
					$("#water-minus").prop('disabled',true);
					$("#water-plus").prop('disabled',true);

					$('#water-price').html('N/A');
				} else {
					$('#water-price').html(allData['i_water'] + '/unit');

					$("#water-minus").removeAttr('disabled');
					$("#water-plus").removeAttr('disabled');
				}


				//Gas
				if((allData['current_loc'] == 'SD1') || (allData['current_loc'] == 'SD2') 
						|| (allData['current_loc'] == 'SD3') || (allData['current_loc'] == 'SD4') 
						|| (allData['current_loc'] == 'SD5') || (allData['current_loc'] == 'SD6') 
						|| (allData['current_loc'] == 'T1') || (allData['current_loc'] == 'T2') 
						|| (allData['current_loc'] == 'B1') || (allData['current_loc'] == 'B2')
						|| (allData['current_loc'] == 'Treasure Spot' )) 
				{	
					//if(allData['i_gas'] == -1) {
					$("#gas-minus").prop('disabled',true);
					$("#gas-plus").prop('disabled',true);

					$('#gas-price').html('N/A');                 
				} else {
					$('#gas-price').html(allData['i_gas'] + '/unit');

					$("#gas-minus").removeAttr('disabled');
					$("#gas-plus").removeAttr('disabled');
				}


				//Treasure
				if(allData['i_treasure'] == -1) {
					$('#trea-price').html("N/A");               
				} else {
					$('#trea-price').html(allData['i_treasure'] + '/unit');

					//use user table price instead if Trojan Island since it changes
					if(allData['current_loc'] == 'Trojan Island') {
						$('#trea-price').html(allData['trojan_trea_price'] + '/unit');
					}

					//enables sell button if player has treasure and is where they can sell it
					var treasure_qty = parseInt($('#trea-qty').val());

					if(treasure_qty <= 0) {
						//do nothing
					} else {
						$('#trea-btn').removeAttr('disabled');
					}
				}

				//Receive possible destinations based on island, parse, and put into select menu
				var dest = allData['i_destinations'];
				dest = dest.split(',');

				//remove all options, if any
				$("#dest_select").html('');
				//add current destination to select menu for old sea captain
				$("#dest_select").append('<option value="0">' + allData['current_loc'] + '</option>');

				for(i = 0; i < dest.length; i++) {
					$("#dest_select").append('<option ' + 'value=' + '"' + dest[i] + '">' + dest[i] + '</option>');
				}

				//handle weather
				if(allData['a_weather'] == 'rain') {
					$("#weather-forecast-span").removeClass();
					$("#weather-forecast-span").addClass("fa fa-umbrella");
					//display rain alert
					$("#weather-forecast").val('Rough Seas: Ships in open water consume 2X normal resources');
				
					//if current_loc is open water, then double resource use for today
					if((allData['current_loc'] == 'SD1') || (allData['current_loc'] == 'SD2') || (allData['current_loc'] == 'SD3') || (allData['current_loc'] == 'SD4') || (allData['current_loc'] == 'SD5') || (allData['current_loc'] == 'SD6') || (allData['current_loc'] == 'T1') || (allData['current_loc'] == 'T2') || (allData['current_loc'] == 'B1') || (allData['current_loc'] == 'B2')) {
						food_used = 2;
						water_used = 2;
						gas_used = 2;
					}
				} else {
					//display sunny alert
					$("#weather-forecast-span").removeClass();
					$("#weather-forecast-span").addClass("fa fa-sun-o");
					$("#weather-forecast").val('Clear, Sunny Day');
					$("#weather-forecast").val('Clear, Sunny Day.');
				}

				//if player runs out of resource: handle ship speed
				if((allData['day'] == -3) || (allData['day'] == -2) || (allData['day'] == -1) || (same_place == 1)) {
					//do nothing  
				} else {                        
					//if player runs out of food AND water, half speed
					//this was originally qtr speed, but decided to remoce qtr speed
					// run out of food and water alert
					if((allData['food'] == 0) && (allData['water'] == 0)) {
						eventAlert(true,true,false,false,false);
						speedHelper(0.5);
						speedNotice(0.5, allData['current_loc']);
					}
					//restore player speed if more food and/or water is bought
					// run out of food alert
					if((allData['food'] == 0) && (allData['water'] > 0)) {
						eventAlert(true,false,false,false,false);
						speedHelper(0.5);
						speedNotice(0.5, allData['current_loc']);
					}
					// run out of water alert
					if((allData['water'] == 0) && (allData['food'] > 0)) {
						eventAlert(false,true,false,false,false);
						speedHelper(0.5);
						speedNotice(0.5, allData['current_loc']);
					}
					if((allData['food'] > 0) && (allData['water'] > 0)) {
						speedHelper(1);
						speedNotice(1, allData['current_loc']);
					}

				}

				//if player and captain are at same location, enable speak with captain button
				if((allData['current_loc'] == allData['a_captain']) && ($('#current-loc').val() != 'At Sea')) {
					$("#sea-captain").removeClass('btn btn-danger btn-block dropdown-toggle');             //change color
					$("#sea-captain").addClass('btn btn-success btn-block dropdown-toggle');
					$("#sea-captain").html('Speak to the Crusty Old Sea Captain <span class="caret"></span>');        //change btn text
					$("#sea-captain").removeAttr('disabled');
				}

				//Disable location selection during planning period
				if((allData['day'] == -3) || (allData['day'] == -2) || (allData['day'] == -1)) {
					$("#dest_select").prop('disabled', true);
				}

				//Enable or disable SOS if any of player's resources goes down to less than 3
				if((allData['day'] == -3) || (allData['day'] == -2) || (allData['day'] == -1)) {
					$("#sos-button").prop('disabled',true);
				} else {
					if ((allData['food'] < 3) || (allData['water'] < 3) || (allData['gas'] < 3)) {
						$("#sos-button").removeAttr('disabled');
					} else {
						$("#sos-button").prop('disabled',true);
					}
				}

				//TREASURE SPOT: Player at the treasure spot will receive one unit of treasure per day
				if((allData['current_loc'] == 'Treasure Spot') && ($('#current-loc').val() != 'At Sea')) {
					var treasure = parseInt($("#trea-qty").val()) + 1;
					$("#trea-qty").val(treasure);
				}



				//GAME DISRUPTION LOGIC: Implement disruptions announced to player at beginning of select days
					//1. Facilitator changes day and enables submission.
					//2. Player submits, DB is updated, and this is page is called to update UI
					//******************
					//(Day 4) If Day 5, then Food = 100 & Gas = 200 @ SDI
						//Disable Destination Select for those with SDI as current_loc. (Lose a Day)
					//(Day 6) Server-Side: Remove half user's water
					//(Day 8) Food = 100 and Gas = 200 @ Duck & Beaver | Remove Duck & Beaver as Destinations for Day 8 & 9
					//(Day 9) Cardinal Island doesn't buy treasure
					//(Day 10) Server-Side: Remove half of user's food
					//(Day 11) Bear Island doesn't sell food or gas
						//Disable Destination Select for those with Bear Island as current_loc (Lose a Day)
					//(Day 13) Remove 1000 cash from players with Trojan Island as current_loc

				//DAY 4 DISRUPTIONS
				if((allData['day'] >= 5) && (allData['current_loc'] == 'Sun Devil Island')) {
					$('#food-price').html('100/unit');
					$('#gas-price').html('200/unit');
				}
				if((allData['day'] == 4) && (allData['current_loc'] == 'Sun Devil Island')) {
					$("#dest_select").prop('disabled', true);
				}
				//DAY 8 DISRUPTIONS
				if((allData['day'] >= 8) && ((allData['current_loc'] == 'Duck Island') || (allData['current_loc'] == 'Beaver Island'))) {
					$('#food-price').html('100/unit');
					$('#gas-price').html('200/unit');
				}                                      
				if(((allData['day'] == 8) || (allData['day'] == 9)) && ((allData['current_loc'] == 'Duck Island') || (allData['current_loc'] == 'Beaver Island'))) {
					$("#dest_select").prop('disabled', true);
				}
				//DAY 9 DISRUPTIONS
				if(allData['day'] >= 9 && (allData['current_loc'] == 'Cardinal Island')) {
					$('#trea-price').html("N/A");
					$("#trea-btn").prop('disabled',true);
					//let player know why he can't sell here
					$('#treasure-group').attr('data-original-title', 'As result of a pirate raid, Cardinal will no longer buy treasure.');
				}
				//DAY 11 DISRUPTIONS
				if((allData['day'] >= 12) && (allData['current_loc'] == 'Bear Island')) {
					$('#food-price').html('N/A');
					$('#gas-price').html('N/A');

					$("#food-minus").prop('disabled',true);
					$("#food-plus").prop('disabled',true);
					$("#gas-minus").prop('disabled',true);
					$("#gas-plus").prop('disabled',true);                                               
				}                    
				if((allData['day'] == 11) && (allData['current_loc'] == 'Bear Island')) {
					$("#dest_select").prop('disabled', true);
				}
				//DAY 13 DISRUPTIONS
				if((allData['day'] == 13) && (allData['current_loc'] == 'Trojan Island')) {
					//NOTE: cash value may become negative if player has less than 1000
					$("#cash").val(allData['cash'] - 1000);
				}               

				//display alert for the day
				//$("#alert-insert").prepend('<div class="alert alert-warning alert-dismissible fade in" role="alert" id="bar"><button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button><i class="fa fa-warning"></i><strong> Travel Advisory </strong>' + allData['a_description'] + '</div>');
				$("#timeline-planning").attr("data-original-title",allData['a_description']);

			}
			dead = days_out_of_fuel > 3 ? true : false;
		
			// Display daily message
			//console.log($("#dayaudio").src);
			if(!resourcesOnly && !dead) // don't execute for trade refresh, only day progress
			{
				$('#tradeIncomingModal').modal('hide');
				$(".dayAlert").hide();
				$('#Modal').modal('hide'); //closing modals on day change 
				var didLoad = false;
				var video = false;

				if(allData['day'] > 0 )
				{
					var filebase = "day" + allData['day'] + "announcement";
					
				}
				else if(allData['day'] == 15)
				{
					var filebase = "endofgame";
				}
				else
				{
					var filebase = "planning";
				}
				$("#daymessage").text( allData['ancm_description']);
				addToChatLog(allData['day'], allData['ancm_description']);
				var dayMsgAV = loadMultiMedia(filebase, "day");
				if(dayMsgAV)
				{
					console.log("#day"+dayMsgAV);
					$("#day"+dayMsgAV).on('ended', function()
					{

						if($("#dayAlertVideo").is(":visible"))
						{
							$("#dayAlertVideo").get(0).play();
						}
						else if($("#dayAlertAudio").is(":visible"))
						{
							$("#dayAlertAudio").get(0).play();
						}
						else if($("#eventAlertVideo").is(":visible"))
						{
							$("#eventAlertVideo").get(0).play();
						}
						else if($("#eventAlertAudio").is(":visible"))
						{
							$("#eventAlertAudio").get(0).play();
						}
					});
				}
				
				
				$("#dayMessageModal").modal();
				
				if(allData['a_description'] != "")
				{
					
					$("#dayAlertMessage").text(allData['a_description']);
					var day = allData['day'];
					addToChatLog(day, allData['a_description']);
					var alertMsgAV = loadMultiMedia("day"+day+"alert", "dayAlert");
				
					if(alertMsgAV)
					{
						$("#dayAlert"+alertMsgAV).on('ended', function()
						{
							console.log("Day alert ended");
							if($("#eventAlertVideo").is(":visible"))
							{
								$("#eventAlertVideo").get(0).play();
							}
							else if($("#eventAlertAudio").is(":visible"))
							{
								$("#eventAlertAudio").get(0).play();
							}
						});
					}
					
					$(".dayAlert").show();
				}

				if(dead)
				{
					goButton();
				}

				console.log("Doing gas test");
				$("#at-sea-warning").hide();
				$("#island-warning").hide();
				//if player runs out of gas, dead
				if((allData['gas'] == 0) && (!isIsland(allData['current_loc']) || $('#current-loc').val() == "At Sea")) {
					//Increment days out of fuel
					days_out_of_fuel++;

					// ##################### player is dead when it is out of fuel #####################
					if(days_out_of_fuel > 3)
					{
						console.log ("^^^^^^^^^^ in poll player ");
						//Display modal alert and make sure user can't close modal alert if they die
						$('#myModal-dead').modal({
							show: true,
							backdrop: 'static',
							keyboard: false
						});

					} else {
						$("#death-warning").show();

						var days_left = 4 - days_out_of_fuel;
						if(days_left > 1)
						{
							$(".days-before-death").each(function()
							{
								$(this).text("in " + days_left + " days");
							});
							
						}
						else if(days_left == 1)
						{
							$(".days-before-death").each(function()
							{
								$(this).text("at days end");
							});
						}
						$("#at-sea-warning").show();	
					}
				
					//Get and Populate modal with team data
					// deadPlayerResponse();
					 
				}
				else if((allData['gas'] == 0) && isIsland(allData['current_loc']) && $('#current-loc').val() != "At Sea")
				{
					//out of gas, but on trojan island. Don't increment counter, don't reset
					if(days_out_of_fuel > 0)
					{
						$("#death-warning").show();
						var days_left = 4 - days_out_of_fuel;
						if(days_left > 1)
						{
							$(".days-before-death").each(function()
							{
								$(this).text("in " + days_left + " days");
							});
						}
						else if(days_left == 1)
						{
							$(".days-before-death").each(function()
							{
								$(this).text("at days end");
							});
						}					
					}
					else
					{
						$("#death-warning").hide();
					}
					$("#island-warning").show();
					
				}
				else if(allData['gas'] != 0) 
				{
					//set days out of fuel back to 0
					days_out_of_fuel = 0;
					$("#death-warning").hide();
				}
				else
				{
					console.log ("condition 5");
					$("#death-warning").hide();
				}

				
			}		
		}
	}
	xmlhttp.open("GET","player_response.php?token="+"<?PHP echo $_SESSION['user']['token']; ?>",true);
	xmlhttp.send();	

	if (dead)
	{
		console.log ("^^^^^^^^^^^ in dead condition");
		$('#myModal-dead').modal({
			show: true,
			backdrop: 'static',
			keyboard: false
		});
	}
}

function purchaseResources(){

	console.log("clicked");

	var foodQty = parseInt($("#food-qty").val());
	var waterQty = parseInt($("#water-qty").val());
	var gasQty = parseInt($("#gas-qty").val());

	// $("#current-food").val(foodQty);
	// $("#current-water").val(waterQty);
	// $("#current-gas").val(gasQty);

	// $("#purchase-current-food").val(foodQty);
	// $("#purchase-current-water").val(waterQty);
	// $("#purchase-current-gas").val(gasQty);

	order_food = foodQty;
	order_water = waterQty;
	order_gas = gasQty;

	$("#purchaseModal").modal('hide');
}

function newPurchase(){
	//update the treasure num according to the treasure on hand

	var treasure = $("#trea-qty").val();

	$("#purchase-current-treasure").val(treasure);
}

function eventAlert(noFood, noWater, noGas, pirateAll, pirateHalf) { 
	var fileBaseName = "";
	var info = "";
	if (noFood && noWater) {
		info = "You have run out of BOTH food and water! " +
		 	"The crew is weak so it will take twice as long to reach your destination.";
		fileBaseName = "out-of-food-water";
		
	} else if (noFood) {
		info = "You have run out of food!  " +
			"The crew is weak so it will take twice as long to reach your destination.";
	    fileBaseName = "out-of-food";

	} else if (noWater) {
		info = "You have run of water!  " +
			"The crew is weak so it will take twice as long to reach your destination.";
	    fileBaseName = "out-of-water";
	} else if (noGas) {
		info = "You are OUT OF GAS and unable to move.  " +
			"Unless someone answers your SOS and offers you assistance within 3 days, you will DIE!!!";
	    fileBaseName = "out-of-gas";
	} else if (pirateAll) {
		info = "Pirates have ATTACKED!!!  " +
			"They have stolen all your Treasure and half of your food and gas.";
	    fileBaseName = "pirate-attack";
	}
	//*****NOTE there are 2 different pirate attack text and audio messages based on if you are on Bruin Island or At Sea
	//Please incorporate these
	//Bruin Island Message
	/*
	Unfortunately, you have landed on the Pirates' hideout.  They steal half your food and gas, leaving you your ship and your lives.
	*/
	
    // Display the modal with info and random video
	addToChatLog(allData['day'], info);
	
	$("#eventAlertMessage").val(info);
	$("#eventAlertMessage").text(info);
	
	$(".eventAlert").show();

	loadMultiMedia(fileBaseName, "eventAlert");

}