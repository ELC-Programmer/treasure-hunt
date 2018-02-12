var THMap = function()
{
	//
};

THMap.prototype = {

	/**
	 * Initialize the 3D Map
	 * @param window The window in which to draw the map.
	 * @param containerElement The HTML element in which to draw the map.
	 */
	Start: function(window, containerElement) {

		this.window = window; // Save the window variable
		var that = this; // Save 'this' for inner function contexts

		// Init the renderer/canvas
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		containerElement.appendChild(this.renderer.domElement);

		// OnResize
		window.addEventListener('resize', function(event) {
			that.renderer.setSize(that.window.innerWidth, that.window.innerHeight);
			that.camera.aspect = that.window.innerWidth / that.window.innerHeight;
			that.camera.updateProjectionMatrix();
		}, false);

		// Load 3D objects
		this._LoadObjects({
			"scene": "./assets/Objects/scene.json",
			"ship": "./assets/Objects/ship.json",			
		}, function(loadedObjects) {

			//save the main scene
			that.scene = loadedObjects["scene"];
			that.scene.background = new THREE.Color(0x999999); //grey bg

			// mirror the islands (I don't know why this is necessary...)
			var islands = that.scene.getObjectByName("islands").children;
			for (var i in islands) {
				islands[i].scale.x = -islands[i].scale.x;
				islands[i].scale.y = -islands[i].scale.y;
			}
			
			// Save the ship model
			that.shipObject = loadedObjects["ship"];			
		
			// Call other initialization Functions
			that._InitLabels();
			that._InitOcean();
			that._InitLights();
			that._InitCamera();
			that._InitSky();
			that._InitPathfinding();
		
			that.AddShip("A", "SD2");
			that.AddShip("B", "SD3");
			that.AddShip("C", "SD2");
			that.AddShip("D", "SD2");
			that.AddShip("E", "SD2");
			// that.AddShip("F", "trojan-island");
			// that.AddShip("G", "trojan-island");
			
			// Begin rendering loop
			that._Render();
		});
	},

	/**
	 * Load 3D objects asynchronously (models/scenes)
	 * @param filenames An object of key-value pairs. Each value should be a filename.
	 * @param callback A function to call when loading is complete. The function should take one argument: an object of key-value paris. Each value will be a loaded THREE.Object3D.
	 */
	_LoadObjects: function(filenames, callback)
	{
		var out = {};

		var loader = new THREE.ObjectLoader();
		for (let key in filenames)
		{
			var filename = filenames[key];
			loader.load(filename, function(loadedScene) {
				out[key] = loadedScene;
				finishLoading();
			});
		}

		function finishLoading()
		{
			if (Object.keys(out).length == Object.keys(filenames).length)
			{
				callback(out);
			}
		}
	},

	/**
	 * Initialize labels based on hierarchy elements named "Label:<label contents>".
	 */
	_InitLabels: function()
	{
		var that = this;

		var prefix = "Label:";

		this.scene.traverseVisible(function(obj) { // foreach object in scene

			if (obj.name.startsWith(prefix)) // then make a label
			{
				var text = obj.name.substr(prefix.length);

				var bb = that._CreateBillboard(text);
				bb.position.z = Math.random() * 0.01;
				that._RegisterSpriteScaling(bb, 1, 3, 10, 4);
				obj.add(bb);
			}
		});
	},

	/**
	 * Initialize the skybox.
	 */
	_InitSky: function()
	{
		// Init Sky Effect
		this.sky = new THREE.Sky();
		this.sky.scale.setScalar(450000);
		this.scene.add(this.sky);

		// Init Sun
		this.sun = new THREE.Mesh(
			new THREE.SphereBufferGeometry(20000, 16, 8),
			new THREE.MeshBasicMaterial(0xffffff)
		);
		this.sun.position.y = -700000;
		//this.scene.add(sun);

		// Set sky parameters
		var uniforms = this.sky.material.uniforms;
		uniforms.turbidity.value = 10;
		uniforms.rayleigh.value = 2;
		uniforms.mieCoefficient.value = 0.005;
		uniforms.mieDirectionalG.value = 0.95;
		uniforms.luminance.value = 1;

		// Set sky and sun distance
		var distance = 400000;
		var theta = -0.02 * Math.PI;
		var phi = -0.5 * Math.PI;
		this.sun.position.x = distance * Math.cos(phi);
		this.sun.position.y = distance * Math.sin(phi) * Math.sin(theta);
		this.sun.position.z = distance * Math.sin(phi) * Math.cos(theta);
		uniforms.sunPosition.value.copy(this.sun.position);

		// Init fog
		this.scene.fog = new THREE.Fog( 0xffffff, 10, 1000 );

		/*
		// SKYBOX
		var imagePrefix = "assets/Textures/SkyboxSet1/ThickCloudsWater/ThickCloudsWater";
		var directions = ["Left2048","Right2048","Up2048","Down2048","Front2048","Back2048"];
		var imageSuffix = ".png";
		var skyGeometry = new THREE.CubeGeometry(1000,1000,1000);

		var materialArray = [];
		for (var i=0; i<6; i++)
		  materialArray.push(new THREE.MeshBasicMaterial({
			map: THREE.ImageUtils.loadTexture(imagePrefix + directions[i] + imageSuffix),
			side: THREE.BackSide
		  }));
		var skyMaterial = new THREE.MeshFaceMaterial(materialArray);
		var skyBox = new THREE.Mesh(skyGeometry, skyMaterial);

		this.scene.add(skyBox);
		*/
	},

	/**
	 * Initialize the ocean.
	 */
	_InitOcean: function()
	{
		var that = this;

		// extend ocean floor to horizon:
		var floor = this.scene.getObjectByName("floor");
		floor.scale.x = 1000;
		floor.scale.y = 1000;

		// water object
		var oceanGeometry = new THREE.PlaneBufferGeometry(40, 40);
		var oceanTexture = new THREE.TextureLoader().load("assets/Textures/ocean_texture4.png");
		this.ocean = new THREE.Water(oceanGeometry, {
			color: '#41acf4',
			scale: 1.5,
			flowDirection: new THREE.Vector2(0, 0),
			textureWidth: 1024,
			textureHeight: 1024,
			texture: oceanTexture,
			reflectivity: 0.6,
			waterColor: '#41acf4',
			alpha: 1.0

		} );
		this.ocean.rotation.x = Math.PI * -0.5;
		this.ocean.rotation.z = Math.PI;
		this.scene.add(this.ocean);

		// big water object
		var bigOceanGeometry = new THREE.Geometry();
		bigOceanGeometry.vertices.push(new THREE.Vector3(-1000, 0, -1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(-1000, 0, 1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(-20, 0, 1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(20, 0, 1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(1000, 0, 1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(1000, 0, -1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(20, 0, -1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(-20, 0, -1000));
		bigOceanGeometry.vertices.push(new THREE.Vector3(-20, 0, -20));
		bigOceanGeometry.vertices.push(new THREE.Vector3(-20, 0, 20));
		bigOceanGeometry.vertices.push(new THREE.Vector3(20, 0, 20));
		bigOceanGeometry.vertices.push(new THREE.Vector3(20, 0, -20));

		var normal = new THREE.Vector3(0, 1, 0);
		bigOceanGeometry.faces.push(new THREE.Face3(0, 1, 2, normal));
		bigOceanGeometry.faces.push(new THREE.Face3(0, 2, 7, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(9, 2, 3, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(9, 3, 10, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(7, 8, 11, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(7, 11, 6, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(6, 3, 4, normal));
		// bigOceanGeometry.faces.push(new THREE.Face3(6, 4, 5, normal));

		//addBigOcean(bigOceanGeometry, 0, 0);
		addBigOcean(new THREE.PlaneBufferGeometry(2000, 2000), 0, 0);
		//addBigOcean(new THREE.PlaneBufferGeometry(980, 2000), -510, 0);
		//addBigOcean(new THREE.PlaneBufferGeometry(40, 980), 0, 510);
		//addBigOcean(new THREE.PlaneBufferGeometry(980, 2000));

		function addBigOcean(geometry, x, z)
		{
			var bigOcean = new THREE.Water(geometry, {
				color: '#41acf4',
				scale: 100,
				flowDirection: new THREE.Vector2(0, 0),
				textureWidth: 1024,
				textureHeight: 1024,
				reflectivity: 0.6,
				waterColor: 0x41acf4,
				alpha: 1.0
			} );

			bigOcean.rotation.x = -Math.PI/2;
			bigOcean.position.x = x;
			bigOcean.position.z = z;
			bigOcean.position.y = -0.01;

			that.scene.add(bigOcean);

			return bigOcean;
		}

		//ocean reflections
		var geometry = new THREE.SphereGeometry(3000, 60, 40);
		var uniforms = {
		  texture: { type: 't', value: THREE.ImageUtils.loadTexture("assets/Textures/SkyboxSet1/ThickCloudsWater/ThickCloudsWaterFront2048.png") }
		};

		var vertexShader = [
			'varying vec2 vUV;',

			'void main() {',
			'  vUV = uv;',
			'  vec4 pos = vec4(position, 1.0);',
			'  gl_Position = projectionMatrix * modelViewMatrix * pos;',
			'}'
		].join("\n");

		var fragmentShader = [
			'uniform sampler2D texture;',
			'varying vec2 vUV;',

			'void main() {',
			'  vec4 sample = texture2D(texture, vUV);',
			'  gl_FragColor = vec4(sample.xyz, sample.w);',
			'}'
		].join("\n");

		var material = new THREE.ShaderMaterial( {
		  uniforms:       uniforms,
		  vertexShader:   vertexShader,
		  fragmentShader: fragmentShader,
			transparent: true,
			opacity: 0.5
		});

		sun = new THREE.Mesh(geometry, material);
		sun.scale.set(-1, 1, 1);
		sun.eulerOrder = 'XZY';
		sun.renderDepth = 1000.0;
		this.scene.add(sun);


		var imagePrefix = "assets/Textures/SkyboxSet1/ThickCloudsWater/ThickCloudsWater";
		var directions = ["Left2048","Right2048","Up2048","Down2048","Front2048","Back2048"];
		var imageSuffix = ".png";
		var skyGeometry = new THREE.CubeGeometry(1000,1000,1000);

		var materialArray = [];
		for (var i=0; i<6; i++)
		  materialArray.push(new THREE.MeshBasicMaterial({
			map: THREE.ImageUtils.loadTexture(imagePrefix + directions[i] + imageSuffix),
			side: THREE.BackSide,
			transparent: true,
			opacity: 0.5,
			alpha: 1.0
		  }));
		var skyMaterial = new THREE.MeshFaceMaterial(materialArray);
		var skyBox = new THREE.Mesh(skyGeometry, skyMaterial);

		this.scene.add(skyBox);

	},

	/**
	 * Initialize the lights.
	 */
	_InitLights: function()
	{
		// sunlight!
		this.sunlight = new THREE.PointLight();
		this.sunlight.position.set(1, 1, -1);
		this.scene.add(this.sunlight);

		// counter light
		this.counter_light = new THREE.DirectionalLight();
		this.counter_light.position.set(-1, -1, 1);
		this.scene.add(this.counter_light);

		// ambient light
		this.moonlight = new THREE.PointLight(0x8888ff);
		this.moonlight.position.set(0, 10, 0);
		this.scene.add(this.moonlight);

	},

	/**
	 * Initialize the camera.
	 */
	_InitCamera: function()
	{
		// Init the camera
		this.camera = new THREE.PerspectiveCamera(75, this.window.innerWidth / this.window.innerHeight, 0.1, 2000000);

		// position camera
		this.camera.position.x = 0;
		this.camera.position.y = 9;
		this.camera.position.z = -30;
		this.camera.rotation.x = -2.18;
		this.camera.rotation.z = Math.PI;

		// Orbit controls
		var controls = new THREE.OrbitControls( this.camera, this.renderer.domElement );
		controls.minDistance = 2;
		controls.maxDistance = 15;
		controls.zoomSpeed = 2.0;
		controls.maxPolarAngle = Math.PI * 3/8;
		controls.minPanX = -10;
		controls.maxPanX = 10;
		controls.minPanZ = -10;
		controls.maxPanZ = 10;
		controls.update();
	},
	
	/**
	 * A set of map points. See MapPoint.js
	 */
	mapPoints: {},
	
	/**
	 * Initialize pathfinding and map points, etc.
	 */
	_InitPathfinding: function()
	{
		var that = this;
		
		var data = $.ajax({
			url: "./assets/pathfinding_map.txt",
			dataType: "text",
			async: false
		}).responseText;
				
		that.pathfinding_map = data.split(/\r\n|\r|\n/); // split by line			
		that.pathfinder = new Pathfinder(that.pathfinding_map); // init Pathfinder
		
		// Init map points
		function addMapPoint(id, positions)
		{
			that.mapPoints[id] = new MapPoint(that, id, that.pathfinding_map, positions);
		}
		addMapPoint("trojan-island", [new Coords(8, 37)]);
		addMapPoint("bear-island", [new Coords(5, 15)]);
		addMapPoint("duck-island", [new Coords(12, 7)]);
		addMapPoint("beaver-island", [new Coords(28, 9), new Coords(32, 9)]);
		addMapPoint("cardinal-island", [new Coords(38, 18), new Coords(40, 13)]);
		addMapPoint("bruin-island", [new Coords(26, 39)]);
		addMapPoint("sea-devil-island", [new Coords(19, 20), new Coords(16, 21)]);
		addMapPoint("treasure-spot", [new Coords(39, 25)]);
		addMapPoint("SD1", [new Coords(10, 20)]);
		addMapPoint("SD2", [new Coords(13, 27)]);
		addMapPoint("SD3", [new Coords(21, 27)]);
		addMapPoint("SD4", [new Coords(26, 26)]);
		addMapPoint("SD5", [new Coords(31, 22)]);
		addMapPoint("SD6", [new Coords(30, 17)]);
		addMapPoint("T1", [new Coords(18, 32)]);
		addMapPoint("T2", [new Coords(30, 30)]);
		addMapPoint("B1", [new Coords(18, 37)]);
		addMapPoint("B2", [new Coords(38, 37)]);
	},
	
	/**
	 * Update a value on the pathfinding map.
	 * @param position The Coords of the position at which to change the map.
	 * @param status The status to set the position to. Valid values are "empty", "obstacle", and "parked".
	 */
	UpdatePathfindingMap(position, status)
	{
		var character = (status == "free" ? '.' : (status == "parked" ? '@' : 'x'));
		
		console.log(character);
		
		var old = this.pathfinding_map[position.y];
		this.pathfinding_map[position.y] = old.slice(0, position.x) + character + old.slice(position.x+1);
	},

	/**
	 * Create a billboard with a text label.
	 * @param text The text to print.
	 * @return A Three.Object3D that is the billboard.
	 */
	_CreateBillboard: function(text)
	{
		// Make Canvas
		var canvas = this.window.document.createElement("canvas");
		canvas.width = 1024;
		canvas.height = 1024;

		var ctx = canvas.getContext("2d");
		ctx.font = "Bold 100px Cousine";
		ctx.textAlign = "center";

		ctx.fillStyle = "black";
		ctx.globalAlpha = 0.5;
		var rectW = text.length * 63;
		ctx.fillRect(canvas.width/2 - rectW/2, canvas.height/2 - 40, rectW, 120);
		ctx.globalAlpha = 1;

		ctx.fillStyle = "white";
		ctx.fillText(text, canvas.width/2, canvas.height/2 + 50);

		//ctx.strokeStyle = "black";
		//ctx.strokeText(text, canvas.width/2, canvas.height/2 + 50);

		// Make Sprite
		var texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		var material = new THREE.SpriteMaterial({
			map: texture
		});
		var sprite = new THREE.Sprite(material);
		sprite.scale.set(5, 5, 1);

		return sprite;
	},

	/**
	 * Register an interpolation of a sprite's scaling as a function of its distance to the camera.
	 * @param sprite The sprite, a THREE.Sprite.
	 * @param d1 Camera distance at point 1.
	 * @param s1 Sprite scaling at point 1.
	 * @param d2 Camera distance at point 2.
	 * @param d2 Sprite scaling at point 2.
	 */
	_RegisterSpriteScaling: function(sprite, d1, s1, d2, s2)
	{
		sprite.animatedScaling = {
			d1: d1,
			s1: s1,
			d2: d2,
			s2: s2
		};
	},

	/**
	 * An array of all the ships on the map, indexed by ID. See Ship.js
	 */
	ships: {},
	
	/**
	 * Add a ship to the map!
	 * @param id A unique string ID for this ship, to identify it later.
	 * @param startingPoint The ID of the MapPoint to start at.
	 */
	AddShip(id, startingPoint)
	{
		var ship = new Ship(this, id, this.mapPoints[startingPoint]);
		this.ships[id] = ship;
	},
	
	/**
	 * Move a ship to a new map point.
	 * @param id The ID of the ship to move.
	 * @param destination The ID of the destination map point.
	 */
	MoveShip: function(shipID, destinationID)
	{
		this.ships[shipID].MoveTo(this.mapPoints[destinationID]);
	},
	
	/**
	 * Enter the rendering/animation loop.
	 */
	_Render: function() {

		var that = this;
		function animate() {
			requestAnimationFrame(animate);

			that._AnimateSky();
			that._AnimateOcean();
			that._AnimateSpriteScaling();
			
			for (i in that.ships) // Update ships
			{
				that.ships[i].Update();
			}
			that.renderer.render(that.scene, that.camera);
		}
		animate();
	},

	/**
	 * Pass a day.
	 */
	PassDay: function() {

		this.dayCycleClockStartTime = Date.now();

	},

	/**
	 * The time at which the day/night cycle should pause for gameplay.
	 */
	dayCycleStopTime: 9*Math.PI/8 * 1000,

	/**
	 * The current time in the day/night cycle.
	 */
	dayCycleTime: -1,

	/**
	 * Animate the day/night cycle
	 */
	 _AnimateSky: function() {

		if (this.dayCycleTime < 0) this.dayCycleTime = this.dayCycleStopTime;

		var cycleLength = 2*Math.PI*1000;
		if (Date.now() - this.dayCycleClockStartTime < cycleLength)
		{
			this.dayCycleTime = this.dayCycleStopTime + Date.now() - this.dayCycleClockStartTime;
		}

		var t = this.dayCycleTime;

		t *= 0.001; // slow down

		t = t + Math.sin(t - Math.PI/2); // make the night fast
		t = t - 0.3*Math.sin(2*t); // Make the sunrises and sunsets long and beautiful!

		// Set sky and sun distance
		var distance = 400000;
		var theta = t;
		//theta = -Math.PI/5

		var phi = -0.4 * Math.PI;
		this.sun.position.x = distance * Math.cos(theta) * Math.cos(phi);
		this.sun.position.y = distance * Math.sin(theta) * Math.sin(phi);
		this.sun.position.z = distance * Math.cos(theta); // height
		this.sky.material.uniforms.sunPosition.value.copy(this.sun.position);

		// Update the lighting
		this.sunlight.position.x = this.sun.position.x;
		this.sunlight.position.y = this.sun.position.y;
		this.sunlight.position.z = this.sun.position.z;

		this.counter_light.position.x = -this.sunlight.position.x;
		this.counter_light.position.y = this.sunlight.position.y;
		this.counter_light.position.z = -this.sunlight.position.z;

		this.sunlight.intensity = Math.sin(-theta);
		this.counter_light.intensity = 0.3*this.sunlight.intensity;

		this.moonlight.intensity = Math.pow(Math.max(0.3, Math.sin(theta)), 0.05);

		// Update sprite lighting
		// this.scene.traverseVisible(function(obj) { // foreach object in scene
			// if (obj.isSprite)
			// {
				// obj.material.opacity = Math.pow(Math.max(0.01, Math.sin(-theta)), 0.05);
			// }
		// });

		// Update the fog color
		var time = (theta + Math.PI/2) % (2*Math.PI); // 0 is midnight, PI is noon, 2PI is midnight
		var color = Math.pow(0.5*Math.cos(time) + 0.5, 3);
		this.scene.fog.color = new THREE.Color(color, color, color);
	 },

	/**
	 * Animate the ocean.
	 */
	_AnimateOcean: function() {
		// animate ocean
		var t_ocean = Date.now() * 0.001;
		var h = 0.01;
		this.ocean.position.y = h/2*Math.sin(t_ocean) + h/2;
		
		// animate the ships on the ocean
		for (i in this.ships)
		{
			var ship = this.ships[i];
			
			h = 0.05;
			ship.object.position.y = h/2*Math.sin(t_ocean) + h/2;
			
			var a = 0.1;
			ship.object.rotation.x = -a*Math.cos(t_ocean);
		}
	},

	/**
	 * Animate sprite scaling (see _RegisterSpriteScaling).
	 */
	_AnimateSpriteScaling: function() {

		var that = this;

		this.scene.traverseVisible(function(obj) { // foreach object in scene

			if (obj.isSprite && obj.animatedScaling !== undefined)
			{
				var dist = obj.getWorldPosition().sub(that.camera.getWorldPosition()).dot(that.camera.getWorldDirection());

				var scale = THREE.Math.mapLinear(
					dist,
					obj.animatedScaling.d1,
					obj.animatedScaling.d2,
					obj.animatedScaling.s1,
					obj.animatedScaling.s2
				);

				scale *= Math.pow(-that.camera.getWorldDirection().dot(that.camera.up), 0.3);

				obj.scale.x = scale;
				obj.scale.y = scale;
			}
		});
	}

};
