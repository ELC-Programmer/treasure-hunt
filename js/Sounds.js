/*
sounds class
Requires Howler.js: https://github.com/goldfire/howler.js
Allows you to play sounds, fade in or out 
sounds list: 
	-  piratesArrgh
	- buoyBells
	- lightningSound
	- stormyAmbience
	- dockedAmbience
	- sunnyAmbience
To play or stop a sound, call fadeInOut:
	sounds.fadeInOut(sounds.SOUND_TO_PLAY, START_VOLUME, END_VOLUME, DURATION_OF_FADE);
Non-ambient sounds will automatically stop playing once done.
*/
class Sounds{
	constructor(){
		this.ambientNoiseVolume = 0.2;
		this.sunnyAmbience = new Howl({
		  src: ['assets/Sounds/sunny-ambient-noise.mp3'],
		  loop: true,
		  volume: 0
		});
		var that = this;
		setTimeout(() => { that.loadSounds(); }, 5000);

	}
	loadSounds(){
		this.piratesArrgh = new Howl({src: ['assets/Sounds/pirate-arrgh.mp3']});
		this.buoyBells = new Howl({src: ['assets/Sounds/buoy-bells.mp3']});
		this.lightningSound = new Howl({src: ['assets/Sounds/lightning.mp3']});
		this.stormyAmbience = new Howl({
		  src: ['assets/Sounds/storm-ambient-noise.mp3'],
		  loop: true,
		  volume: 0,
		  autoplay:false
		});
		this.dockedAmbience = new Howl({
			src: ['assets/Sounds/docked-ambient-noise.mp3'],
			loop: true,
			volume: 0,
			autoplay: false
		});
	}
	fadeInOut(sound, fromVolume, toVolume, duration){
		if(toVolume != 0) sound.play();
		sound.fade(fromVolume, toVolume,duration);
		if(toVolume == 0) sound.stop();
	}
}