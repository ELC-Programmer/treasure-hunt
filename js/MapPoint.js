/**
 * @class MapPoint
 * A navigation point on the map. (i.e. an island or intermediate point)
 */

/**
 * @param thmap The parent THMap.
 * @param id A unique string ID for this map point.
 * @param map The map as a string.
 * @param positions One or more coords of parking spaces. Adjacent parking spaces will be explored automatically.
 */
var MapPoint = function(thmap, id, map, positions)
{
	this.id = id;
	this.thmap = thmap;
	
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