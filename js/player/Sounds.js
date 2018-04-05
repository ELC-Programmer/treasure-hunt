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
		setTimeout(() => { that.loadSounds(); }, 6000); //asynchronously load other sounds

	}
	loadSounds(){
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
								"buoyBells" : new Howl({src: ['assets/Sounds/buoy-bells.mp3'], volume:.4}),
								"lightningSound" : new Howl({src: ['assets/Sounds/lightning.mp3'], volume:.8}),
								"stormyAmbience" : new Howl({
								  src: ['assets/Sounds/storm-ambient-noise.wav'],
								  loop: true,
								  volume: 0,
								  autoplay:false
								}),
								"notificationBell" : new Howl({
								  src: ['assets/Sounds/notification-bell.mp3'],
								  loop: false,
								  autoplay:false
								}),
								"warningSound" : new Howl({src:['assets/Sounds/warning.mp3']})
							};
		this.loadFinished = true;
		this.executeQueue();
	}
	fadeInOut(soundKey, fromVolume, toVolume, duration){
		if(this.soundsDict[soundKey] == null && !this.loadFinished){ //if this function is called before selected sound is loaded, wait for load to complete
			if(soundKey != "stormyAmbience" && soundKey != "dockedAmbience" && soundKey != "sunnyAmbience" && soundKey != "buoyBells") 
				return; //we only care about the looped sounds being played late; others would sound out of time
			var that = this;
			this.queue.push( function(){ that.fadeInOut(soundKey, fromVolume, toVolume, duration) } );
			return;
		}
		if(this.soundsDict[soundKey] == null) {
			console.log("Key "+soundKey+" does not exist."); //if load is finished is key still does not exist, error
			return; 
		}
		if(toVolume != 0 && this.dead == false) this.soundsDict[soundKey].play();
		this.soundsDict[soundKey].fade(fromVolume, toVolume, duration);
	}
	playOnce(key){
		if(this.soundsDict[key] == null){
			console.log("Still loading file.");
			return;
		}
		this.soundsDict[key].play();
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