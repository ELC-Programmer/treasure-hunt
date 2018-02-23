/**
 * @class MapPoint
 * A navigation point on the map. (i.e. an island or intermediate point)
 */

/**
 * @param thmap The parent THMap.
 * @param id A unique string ID for this map point.
 * @param map The map as a string.
 * @param positions One or more coords of parking spaces. Adjacent parking spaces will be explored automatically.
 * @param object The THREE.Object3D representing this map point in the scene.
 */
var MapPoint = function(thmap, id, map, positions, object)
{
	var that = this;
	
	this.id = id;
	this.thmap = thmap;
	this.object = object;
	
	// Find the label object
	var prefix = "Label:";
	this.object.traverseVisible(function(obj) {
		if (obj.name.startsWith(prefix)) {
			that.labelObject = obj;
		}
	});
	
	// Initialize Selection Widget:
	var widgetGeometry = new THREE.IcosahedronGeometry( 0.2, 2 );
	var widgetMaterial = new THREE.MeshStandardMaterial();

	this.selectionWidget = new THREE.Mesh( widgetGeometry, widgetMaterial );	
	this.selectionWidget.position.z = this.labelObject.getWorldPosition().z - this.object.getWorldPosition().z + 0.5;
	this.object.add( this.selectionWidget );
	//this.selectionWidget.material.transparent = true;
	
	// Initialize Parking:
	
	this.parkingSpaces = []; // 13 elements of type ParkingSpace
	
	for (i in positions) // Find all 13 parking spaces!
	{
		var coords = positions[i];
		var queue = [coords];
		var explored = [];
		
		while (queue.length > 0)
		{
			var currentPos = queue.shift();
			explored.push(currentPos);
			
			// record this position
			var index = parseInt(map[currentPos.y][currentPos.x], 16);
			this.parkingSpaces[index] = new ParkingSpace(currentPos);
			
			// explore
			var north = new Coords(currentPos.x, currentPos.y+1);
			var south = new Coords(currentPos.x, currentPos.y-1);
			var east = new Coords(currentPos.x+1, currentPos.y);
			var west = new Coords(currentPos.x-1, currentPos.y);
			explore(north);
			explore(south);
			explore(east);
			explore(west);
			
			function explore(pos)
			{
				for (i in explored)
				{
					var exploredPos = explored[i];
					if (exploredPos.x == pos.x && exploredPos.y == pos.y)
					{
						return;
					}
				}
				
				// unexplored
				var character = map[pos.y][pos.x];
				if ((character >= '0' && character <= '9') || (character >= 'a' && character <= 'c'))
				{ // is valid hexadecimal value
					queue.push(pos);
				}
			}
		}
	}
};

MapPoint.prototype = {

	/**
	 * Reserve the first available parking space.
	 * @param shipID The ID of the reserving ship.
	 * @returns The Coords of the parking space allocated.
	 */
	ReserveParkingSpace: function(shipID)
	{
		for (i in this.parkingSpaces)
		{
			var parkingSpace = this.parkingSpaces[i];
			if (!parkingSpace.reserved)
			{
				parkingSpace.reserved = true;
				parkingSpace.shipID = shipID;
				
				return parkingSpace.position;
			}
		}
	},

	/**
	 * Marks a previously reserved space as an obstacle on the pathfinding map.
	 * @param shipID The ID of the ship that reserved the space.
	 */
	OccupyParkingSpace: function(shipID)
	{
		for (i in this.parkingSpaces)
		{
			var parkingSpace = this.parkingSpaces[i];
			if (parkingSpace.reserved && parkingSpace.shipID == shipID)
			{
				this.thmap.UpdatePathfindingMap(parkingSpace.position, "parked");
				
				parkingSpace.occupied = true;
				return;
			}
		}
	},
	
	/**
	 * Release a previously reserved parking space.
	 * @param shipID The ID of the ship that reserved the space.
	 */
	ReleaseParkingSpace: function(shipID)
	{
		for (i in this.parkingSpaces)
		{
			var parkingSpace = this.parkingSpaces[i];
			if (parkingSpace.reserved && parkingSpace.shipID == shipID)
			{
				this.thmap.UpdatePathfindingMap(parkingSpace.position, "free");
				
				parkingSpace.reserved = false;
				parkingSpace.occupied = false;
				parkingSpace.shipID = '';
				return;
			}
		}
	},
	
	/**
	 * True if this map point is selectable.
	 */
	selectable: false,
	 
	/**
	 * True if this map point is selected.
	 */
	selected: false,
	
	/**
	 * Set the selection state of the map point!
	 * @param selectable True if this map point should indicate that it is selectable.
	 * @param selected True if this map point should indicate that it is selected.
	 */
	SetSelectionState: function(selectable, selected) {
		this.selectable = selectable;
		this.selected = selected;
	},
	
	/**
	 * Check for intersections with a raycaster.
	 * @param raycaster A THREE.Raycaster.
	 * @returns If intersection, the distance from the raycaster origin. Else, false.
	 */
	Intersect: function(raycaster)
	{
		var intersects = raycaster.intersectObject(this.object, true);
		if (intersects.length > 0) { // we intersect!
			return intersects[0].distance;
		}

		// no intersection  :(
		return false;
	},
	
	/**
	 * Update the map point. This function should be called in every iteration of the game loop.
	 */
	Update: function()
	{
		this.selectionWidget.visible = this.selectable;
		var widgetColor = this.selected ? 0x00ff00 : 0x0000ff;
		this.selectionWidget.material.color.setHex(widgetColor);
	}
	
};

/**
 * @class ParkingSpace
 */

var ParkingSpace = function(position)
{
	this.position = position;
	this.x = position.x;
	this.y = position.y;
	
	this.reserved = false;
	this.occupied = false;
	this.shipID = '';
}