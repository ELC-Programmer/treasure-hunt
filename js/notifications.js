class Notifications{
	constructor(){
		this.containerId = "notificationsDiv" ;
		$('body').prepend(this.makeContainer());
		this.numNotifications = 0;

	}
	newMessage(msg){
		if(this.numNotifications > 8){
			queueNotification(msg);
			return;
		}
		var id = 'msgBalloon'+this.numNotifications;
		var newDiv = this.makeNotificationDiv(id, msg)
		window.sounds.fadeInOut("notificationBell", 0, 1, 0);
		$(newDiv).appendTo('#'+this.containerId)
					.animate({top: 0, right:'1vw'}, 2000)
					.click(() => {	openChat(); 
									$('#'+id).animate(	{	'height': 0, 'opacity': 0 }, 
												        750, 
												        function() { $('#'+id).remove(); }
											          );
									this.numNotifications -= 1;
								});
		this.numNotifications += 1;
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
		var notificationStyle = "background-color:rgba(47,48,97,0.8); \
				text-align:center; \
				font-size:4vh;\
				font-family:'Berkshire Swash', cursive;\
				color:white;\
				border-radius:15px;\
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