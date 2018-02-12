
/**
 * Init a ship
 * @param thmap A pointer back to the THMap.
 * @param id A unique string ID for this ship.
 * @param startingPoint The MapPoint at which to start.
 */

var Ship = function(thmap, id, startingPoint)
{
	// save values
	this.thmap = thmap;
	this.id = id;
	this.mapPoint = startingPoint;
	
	// spawn at a parking space
	this.destination = startingPoint.ReserveParkingSpace(this.id);
	this.position = this.GridToWorld(this.destination, this.thmap.pathfinding_map);
		
	// set a random starting angle
	var angle = THREE.Math.randFloatSpread(2*Math.PI);
	this.forward = new THREE.Vector2(Math.cos(angle), Math.sin(angle));
	
	// Spawn a new ship object
	this.object = this.thmap.shipObject.clone(true);
	this.object.rotation.order = "YXZ";
	thmap.scene.add(this.object);
	
	// Make a label for the ship
	this.label = this.thmap._CreateBillboard(this.id);
	this.label.position.y = 0.4 + Math.random() * 0.01;
	this.thmap._RegisterSpriteScaling(this.label, 1, 2, 10, 4);
	this.object.add(this.label);
	this.labelVisible = false;
	
	window.ship = this; // for DEBUGGING!
};

Ship.prototype = {
	
	/**
	 * The time of the last update in msec.
	 */
	lastUpdateTime: -1,
	
	/**
	 * The path we are on.
	 */
	path: [],
	
	/**
	 * The Bezier curve we are currently following!
	 */
	curve: {},
	
	/**
	 * Update the ship. This function should be called in every iteration of the game loop.
	 */
	Update: function()
	{
		// Calculate deltaT in seconds
		var deltaT = (Date.now() - this.lastUpdateTime) * 0.001;
		if (this.lastUpdateTime < 0) deltaT = 0;
		this.lastUpdateTime = Date.now();
				
		var speed = 1; // world distance / second
		var angularSpeed = 3; // radians / second
		
		if (!this.traveling && !this.GetGridPosition().equals(this.destination)) // need to move!
		{
			this.traveling = true;
			this.turning = true;
		}
				
		if (this.traveling)
		{				
			if (this.path.length == 0 || !this.GetGridPosition().equals(this.path[0].cellPos))
			{ // There is a path, and we're not at the front of it: recalculate!
					
				var pathfinder = this.thmap.pathfinder;
				this.path = pathfinder.findPath(
					this.GetGridPosition(), // startPos
					this.destination // goalPos
				);
			}
			
			var nextCell = this.path.length > 1 ? this.path[1].cellPos : this.path[0].cellPos;
			var nextPoint = this.GridToWorld(nextCell);
			
			if (this.turning)
			{ // turn in place before starting to move.
				var targetForward = new THREE.Vector2();
				targetForward.subVectors(nextPoint, this.position).normalize();
				
				var angleDifference = targetForward.angle() - this.forward.angle();
				if (angleDifference > Math.PI) angleDifference -= 2*Math.PI; // turn the shorter way
				
				var angularMovement = angularSpeed * deltaT;
				if (Math.abs(angleDifference) <= angularMovement)
				{ // snap the rest of the way
						
					this.forward = targetForward;
					this.turning = false;
					
				} else { // just rotate a little
					
					if (angleDifference < 0) angularMovement *= -1;
					var newAngle = this.forward.angle() + angularMovement;
					this.forward = new THREE.Vector2(Math.cos(newAngle), Math.sin(newAngle));
				}
			}
			else
			{ // Acutally Move!
				
				var bezierCurve;
				if (this.path.length > 2)
				{ // there is a target
			
					var targetCell = this.path[2].cellPos;
					var targetPoint = this.GridToWorld(targetCell);
			
					var scale = this.position.distanceTo(targetPoint) / 2;
			
					if (this.path.length > 3)
					{ // our target has a target.
						var targetTargetCell = this.path[3].cellPos;
						var targetForward = this.GridToWorld(targetTargetCell).sub(targetPoint).normalize();
											
						var control1 = new THREE.Vector2(), control2 = new THREE.Vector2();
						bezierCurve = new THREE.CubicBezierCurve(
							this.position, // current position
							control1.addVectors(this.position, this.forward.multiplyScalar(scale)), // control point 1
							control2.subVectors(targetPoint, targetForward.multiplyScalar(0.5*scale)), // control point 2
							targetPoint // 2 steps ahead
						);
					} else { // our target is the end of the line
					
						var control1 = new THREE.Vector2();
						bezierCurve = new THREE.QuadraticBezierCurve(
							this.position, // current position
							control1.addVectors(this.position, this.forward.multiplyScalar(scale)), // control point 1
							targetPoint // 2 steps ahead
						);
					}
				}
				else
				{ // there is no target
					var scale = this.position.distanceTo(nextPoint) / 2;
			
					var control1 = new THREE.Vector2();
					bezierCurve = new THREE.QuadraticBezierCurve(
						this.position,
						control1.addVectors(this.position, this.forward.multiplyScalar(scale)),
						nextPoint
					);			
				}
				
				var movement = speed * deltaT;
				var curveIndex = movement / bezierCurve.getLength();
				var newPosition = bezierCurve.getPointAt(curveIndex);
				var displacement = new THREE.Vector2();
				displacement.subVectors(newPosition, this.position);
				
				this.position = newPosition;
				this.forward = bezierCurve.getTangentAt(curveIndex);

				if (displacement.length() <= movement && this.path.length == 1)
				{
					this.position = nextPoint;
					
					this.traveling = false;
					this.path = [];
					this.mapPoint.OccupyParkingSpace(this.id);
					
					console.log("ARRIVED!");
				}
			}
		}
		
		// Update the object.
		this.object.position.x = -this.position.x;
		this.object.position.z = this.position.y;
		this.object.rotation.y = this.forward.angle() - Math.PI/2;
		
		// Update the label.
		this.label.visible = this.labelVisible;
	},
	
	/**
	 * Move to a map point.
	 * @param mapPoint A map point to navigate to.
	 */
	MoveTo: function(dest_mapPoint)
	{
		this.mapPoint.ReleaseParkingSpace(this.id); // release old space
		
		this.destination = dest_mapPoint.ReserveParkingSpace(this.id); // claim new space
		this.mapPoint = dest_mapPoint;
	},
	
	/**
	 * the size of one grid space in actual space
	 */
	cellSize: 8.9/22,

	/**
	 * The nearest grid position to this ship's actual position;
	 */
	GetGridPosition: function()
	{
		var map = this.thmap.pathfinding_map;
		
		var mapW = map[0].length;
		var mapH = map.length;
		var centerX = (mapW-1)/2;
		var centerY = (mapH-1)/2;

		var x = Math.round(this.position.x / this.cellSize) + centerX;
		var y = Math.round(-this.position.y / this.cellSize) + centerY
		return new Coords(x, y);
	},
		
	/**
	 * Given Coords on the pathfinding grid, returns the corresponding actual point.
	 * @param coords Coords on the pathfinding map.
	 * @returns A THREE.Vector2 representing the point in actual space.
	 */
	GridToWorld: function(coords)
	{
		var map = this.thmap.pathfinding_map;
		
		var mapW = map[0].length;
		var mapH = map.length;
		var centerX = (mapW-1)/2;
		var centerY = (mapH-1)/2;
			
		return new THREE.Vector2((coords.x - centerX) * this.cellSize, -(coords.y - centerY) * this.cellSize);	
	}
};