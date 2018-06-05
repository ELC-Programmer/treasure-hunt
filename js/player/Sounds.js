/*
sounds class
Requires Howler.js: https://github.com/goldfire/howler.js
Allows you to play sounds, fade in or out 
sounds list: 
	- piratesArrgh
	- buoyBells
	- lightningSound
	- stormyAmbience
	- dockedAmbience
	- sunnyAmbience
	-notificationBell
To play or stop a sound, call fadeInOut:
	sounds.fadeInOut(sounds.SOUND_TO_PLAY, START_VOLUME, END_VOLUME, DURATION_OF_FADE);
Non-ambient sounds will automatically stop playing once done.
WAV files work better than MP3 files when looping; MP3 files have a brief silent bit at beginning
*/
class Sounds{
	constructor(){
		this.ambientNoiseVolume = 0.2;
		this.loadFinished = false;
		this.queue = Array();
		this.soundsDict = { };
		this.dead = false;
		var that = this;
		setTimeout(() => { that.loadSounds(); }, 1000); //asynchronously load other sounds

	}
	loadSounds(soundFile,callback){
		if(soundFile){
			let scope = this;
			scope.soundsDict[soundFile] = new Howl({src:["assets/Sounds/narration/"+soundFile], onload: callback });
			return;
		}
		this.soundsDict = {  	"dockedAmbience" : new Howl({
									src: ['assets/Sounds/docked-ambient-noise.wav'],
									loop: true,
									volume: 0,
									autoplay: false
								}),
								"sunnyAmbience" : new Howl({
								  src: ['assets/Sounds/sunny-ambient-noise.wav'],
								  loop: true,
								  volume: 0
								}),
								"piratesArrgh" : new Howl({src: ['assets/Sounds/pirate-arrgh.mp3']}),
								"buoyBells" : new Howl({src: ['assets/Sounds/buoy-bells.wav']}),
								"lightningSound" : new Howl({src: ['assets/Sounds/lightning.mp3'], volume:.8}),
								"stormyAmbience" : new Howl({
								  src: ['assets/Sounds/storm-ambient-noise.wav'],
								  loop: true,
								  volume: 0,
								  autoplay:false
								}),
								"notificationBell" : new Howl({
								  src: ['assets/Sounds/notification-bell.wav'],
								  loop: false,
								  autoplay:false,
								  volume:.8
								}),
								"warningSound" : new Howl({src:['assets/Sounds/warning.mp3']}),
								"sos": new Howl({
									src:['assets/Sounds/sos.mp3'],
									loop: false,
									autoplay: false
								})
							};
		this.loadFinished = true;
		this.executeQueue();
	}
	fadeInOut(soundKey, fromVolume, toVolume, duration, onend){
		let scope = this;
		if(this.soundsDict[soundKey] == null && !this.loadFinished){ //if this function is called before selected sound is loaded, wait for load to complete
			if(soundKey != "stormyAmbience" && soundKey != "dockedAmbience" && soundKey != "sunnyAmbience" && soundKey != "buoyBells") 
				return; //we only care about the looped sounds being played late; others would sound out of time
			var that = this;
			this.queue.push( function(){ that.fadeInOut(soundKey, fromVolume, toVolume, duration) } );
			return;
		}
		if(this.soundsDict[soundKey] == null)
		{
			this.loadSounds(soundKey, afterLoaded);
		}
		else
		{
			afterLoaded();
		}

		function afterLoaded()
		{
			if(onend){
				scope.soundsDict[soundKey].on('end',onend);
			}
			else scope.soundsDict[soundKey].on('end',null);
			if(toVolume != 0 && scope.dead == false) scope.soundsDict[soundKey].play();
			scope.soundsDict[soundKey].fade(fromVolume, toVolume, duration);
		}
	}
	playOnce(key,callback){
		return this.fadeInOut(key, 0,1,0.1, callback);
	}
	executeQueue(){
		if(!this.loadFinished) return; 
		while(this.queue.length > 0) this.queue.pop()();
	}
	stopAllSounds(){
		if(!this.loadFinished){
			setTimeout(()=>{this.stopAllSounds();}, 1000);
			return;
		}
		for(var key in this.soundsDict){
			this.soundsDict[key].stop();
		}
	}
}