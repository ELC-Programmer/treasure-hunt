/* adds a notification balloon to the top right corner of the screen
	to make a notification call:
	 					window.notifications = new Notifications();
	 					window.notifications.newMessage("hey ship a!!",false,doSomething());
*/

class Notifications{
	constructor(){
		this.containerId = "notificationsDiv" ;
		$('body').prepend(this.makeContainer());
		this.numNotifications = 0;

	}
	newMessage(message, shouldPersist, onClick){

		var msg = message.slice(0,33);
		if(message.length > 33) msg += '...';
		if(this.numNotifications > 8){
			// queueNotification(msg);
			return;
		}
		var id = 'msgBalloon'+this.numNotifications;
		var newDiv = this.makeNotificationDiv(id, msg)
		window.sounds.fadeInOut("notificationBell", 0, 1, 0);
		$(newDiv).appendTo('#'+this.containerId)
					.animate({top: 0, right:'1vw'}, 2000)
					.click(() => {	if(onClick) onClick();
									$('#'+id).animate(	{	'height': 0, 'opacity': 0 }, 
												        750, 
												        function() { $('#'+id).remove(); }
											          );
									this.numNotifications -= 1;
								});
		if(!shouldPersist){
			setTimeout(()=>{
				$('#'+id).animate(	{	'height': 0, 'opacity': 0 }, 
							        750, 
							        function() { $('#'+id).remove(); }
						          );
				this.numNotifications -= 1;
			},5000);
			this.numNotifications += 1;
		}
	}
	makeContainer(){
		var containerStyle = 	"position:absolute;\
								background-color:rgba(0,0,0,0);\
								right:1vh;\
								z-index:4000;\
								top:1vh;";
		var containerDiv = "<div id='"+this.containerId+"' style='"+containerStyle+"'></div>"
		return containerDiv;
	}
	makeNotificationDiv(id, msg){
		var notificationStyle = "background-color:rgba(47,48,97,0.98); \
				text-align:center; \
				font-size:18pt;\
				font-family:'Berkshire Swash', cursive;\
				color:white;\
				border-radius:5px;\
				right:-10%;\
				top:1vh;\
				margin-right:1vh;\
				margin-top:0.5vh;\
				cursor:pointer;\
				border:1px solid black;";
		var notificationDiv1 = '<div id=',
			notificationDiv2 = ' style="'+notificationStyle+'"><p style="margin: 1vh 1vw 1vh 1vw;">',
			notificationDiv3 = '</p></div>';
		return notificationDiv1+id+notificationDiv2+msg+notificationDiv3;
	}

}