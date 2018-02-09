var THMap = function()
{
	//
}

THMap.prototype = {
	
	/**
	 * Initialize the 3D Map
	 * @param window The window in which to draw the map.
	 * @param containerElement The HTML element in which to draw the map.
	 */
	Start: function(window, containerElement) {
		
		this.window = window; // Save the window variable
		
		// Init the renderer/canvas
		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize(window.innerWidth, window.innerHeight);
		containerElement.appendChild(renderer.domElement);

		// OnResize
		var that = this;
		window.addEventListener('resize', function(event) with {
			that.renderer.setSize(that.window.innerWidth, that.window.innerHeight);
			that.camera.aspect = that.window.innerWidth / that.window.innerHeight;
			that.camera.updateProjectionMatrix();
		}, false);
		
		// Load 3D objects
		this._LoadObjects({
			"scene": "assets/scene.json",
			"ships": "assets/pirate_ship.json"			
		}, function(loadedObjects) {
			
			//save the main scene
			this.scene = loadedObjects["scene"];
			this.scene.background = new THREE.Color(0x999999); //grey bg
			
			// mirror the islands (I don't know why this is necessary...)
			var islands = this.scene.getObjectByName("islands").children;
			for (var i in islands) {
				islands[i].scale.x = -islands[i].scale.x;
				islands[i].scale.y = -islands[i].scale.y;
			}
			
			// Add the ships!
			var ships = loadedObjects["ships"];
			ships.rotation.y = Math.PI * 3/4;
			this.scene.add(ships);
			
			// Call other initialization Functions
			this._InitLabels();
			this._InitOcean();
			this._InitLights();
			this._InitCamera();
			this._InitSkyBox();

			// Begin rendering loop
			this._Render();
		});
	}
	
	/**
	 * Load 3D objects asynchronously (models/scenes)
	 * @param filenames An object of key-value pairs. Each value should be a filename.
	 * @param callback A function to call when loading is complete. The function should take one argument: an object of key-value paris. Each value will be a loaded THREE.Object3D.
	 */
	_LoadObjects: function(filenames, callback)
	{
		var out = {};
		
		var loader = new THREE.ObjectLoader();
		for (key in filenames)
		{
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
	}
	
	/**
	 * Initialize labels based on hierarchy elements named "Label:<label contents>".
	 */
	_InitLabels: function()
	{
		var prefix = "Label:";

		this.scene.traverseVisible(function(obj) { // foreach object in scene

			if (obj.name.startsWith(prefix)) // then make a label
			{
				var text = obj.name.substr(prefix.length);
			
				var bb = this._CreateBillboard(text);
				bb.position.z = Math.random() * 0.01;
				registerSpriteScaling(bb, 1, 3, 10, 4);
				obj.add(bb);
			}
		});
	}
	
	/**
	 * Initialize the skybox.
	 */
	_InitSkyBox: function()
	{
		var imagePrefix = "assets/SkyboxSet1/ThickCloudsWater/ThickCloudsWater";
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
	}
	
	/**
	 * Initialize the ocean.
	 */
	_InitOcean: function()
	{
		var oceanGeometry = new THREE.PlaneBufferGeometry(40, 40);
		var oceanTexture = new THREE.TextureLoader().load("assets/ocean_texture.png");
		//oceanTexture.flipY = false;
		oceanTexture.rotation = Math.PI;
		this.ocean = new THREE.Water(oceanGeometry, {
			color: '#78B2FF',
			scale: 1.5,
			flowDirection: new THREE.Vector2(0, 0),
			textureWidth: 1024,
			textureHeight: 1024,
			texture: oceanTexture,
			reflectivity: 0.6
		} );
		this.ocean.rotation.x = Math.PI * -0.5;
		this.scene.add(this.ocean);

		//ocean reflections (TODO)
		var geometry = new THREE.SphereGeometry(3000, 60, 40);
		var uniforms = {
		  texture: { type: 't', value: THREE.ImageUtils.loadTexture("assets/ThickCloudsWaterFront2048.png") }
		};

		var material = new THREE.ShaderMaterial( {
		  uniforms:       uniforms,
		  vertexShader:   document.getElementById('sky-vertex').textContent,
		  fragmentShader: document.getElementById('sky-fragment').textContent
		});

		skyBox = new THREE.Mesh(geometry, material);
		skyBox.scale.set(-1, 1, 1);
		skyBox.eulerOrder = 'XZY';
		skyBox.renderDepth = 1000.0;
		this.scene.add(skyBox);
	}
	
	/**
	 * Initialize the lights.
	 */
	_InitLights: function()
	{
		// sunlight!
		var sunlight = new THREE.DirectionalLight();
		sunlight.position.set(1, 1, -1);
		this.scene.add(sunlight);

		// counter light
		var counter_light = new THREE.DirectionalLight();
		counter_light.position.set(-1, -1, 1);
		this.scene.add(counter_light);

		// ambient light
		var ambient_light = new THREE.AmbientLight( 0xaaaaaa );
		this.scene.add(ambient_light);
	}
	
	/**
	 * Initialize the camera.
	 */
	_InitCamera: function()
	{
		// Init the camera
		this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
	
		// position camera
		camera.position.x = 0;
		camera.position.y = 9;
		camera.position.z = -30;
		camera.rotation.x = -2.18;
		camera.rotation.z = Math.PI;

		// Orbit controls
		var controls = new THREE.OrbitControls( camera, renderer.domElement );
		controls.minDistance = 2;
		controls.maxDistance = 15;
		controls.zoomSpeed = 2.0;
		controls.maxPolarAngle = Math.PI * 3/8;
		controls.minPanX = -10;
		controls.maxPanX = 10;
		controls.minPanZ = -10;
		controls.maxPanZ = 10;
		controls.update();
	}
	
	
	/**
	 * Create a billboard with a text label.
	 * @param text The text to print.
	 * @return A Three.Object3D that is the billboard.
	 */
	_CreateBillboard: function(text)
	{
		// Make Canvas
		var canvas = document.createElement("canvas");
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

		ctx.strokeStyle = "black";
		ctx.strokeText(text, canvas.width/2, canvas.height/2 + 50);

		// Make Sprite
		var texture = new THREE.Texture(canvas);
		texture.needsUpdate = true;
		var material = new THREE.SpriteMaterial({
			map: texture
		});
		var sprite = new THREE.Sprite(material);
		sprite.scale.set(5, 5, 1);

		return sprite;
	}
	
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
	}
	
	/**
	 * Enter the rendering/animation loop.
	 */
	_Render: function() {
		requestAnimationFrame(this._Render);

		animateOcean();
		animateSpriteScaling();

		renderer.render(scene, camera);
	}
	
	/**
	 * Animate the ocean.
	 */
	_AnimateOcean: function() {
		// animate ocean
		var t_ocean = Date.now() * 0.001;
		var h = 0.01;
		this.ocean.position.y = h/2*Math.sin(t_ocean) + h/2;
	}
	
	/**
	 * Animate sprite scaling (see _RegisterSpriteScaling).
	 */
	_AnimateSpriteScaling: function() {
		this.scene.traverseVisible(function(obj) { // foreach object in scene

			if (obj.isSprite && obj.animatedScaling !== undefined)
			{
				var dist = obj.getWorldPosition().sub(this.camera.getWorldPosition()).dot(this.camera.getWorldDirection());

				var scale = THREE.Math.mapLinear(
					dist,
					obj.animatedScaling.d1,
					obj.animatedScaling.d2,
					obj.animatedScaling.s1,
					obj.animatedScaling.s2
				);

				scale *= Math.pow(-this.camera.getWorldDirection().dot(camera.up), 0.3);

				obj.scale.x = scale;
				obj.scale.y = scale;
			}
		});
	}

}