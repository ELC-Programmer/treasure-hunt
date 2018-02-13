
// extensions

function ArrayExtensions()
{
    // extension class
}
{
    function insertElementSortedByKeyName(array, elementToSort, keyName)
	{
		var keyValueToSort = elementToSort[keyName];
     
        var i;
        for (i = 0; i < array.length; i++)
        {
            var elementAlreadySorted = array[i];
            var keyValueAlreadySorted = elementAlreadySorted[keyName];
              
            if (keyValueToSort < keyValueAlreadySorted)
            {
                break;
            }
        }
  
        array.splice(i, 0, elementToSort);
	}
}


// classes

function Coords(x, y)
{
    this.x = x;
    this.y = y;
}
{
    Coords.prototype.absolute = function()
    {
        this.x = Math.abs(this.x);
        this.y = Math.abs(this.y);
        return this;
    }
      
    Coords.prototype.add = function(other)
    {
        this.x += other.x;
        this.y += other.y;   
        return this;
    }
      
    Coords.prototype.clone = function()
    {
        return new Coords(this.x, this.y);
    }
      
    Coords.prototype.divide = function(other)
    {
        this.x /= other.x;
        this.y /= other.y;
        return this;
    }
      
    Coords.prototype.divideScalar = function(scalar)
    {
        this.x /= scalar;
        this.y /= scalar;
        return this;
    }
      
    Coords.prototype.equals = function(other)
    {
        return (this.x == other.x && this.y == other.y);
    }
     
    Coords.prototype.floor = function()
    {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        return this;
    }
      
    Coords.prototype.isInRange = function(range)
    {
        var returnValue = 
        (
            this.x >= 0
            && this.x <= range.x
            && this.y >= 0
            && this.y <= range.y
        );
          
        return returnValue;
    }
      
    Coords.prototype.multiply = function(other)
    {
        this.x *= other.x;
        this.y *= other.y;
        return this;
    }
      
    Coords.prototype.overwriteWith = function(other)
    {
        this.x = other.x;
        this.y = other.y;    
        return this;
    }
     
    Coords.prototype.overwriteWithXY = function(x, y)
    {
        this.x = x;
        this.y = y;  
        return this;
    }
      
    Coords.prototype.subtract = function(other)
    {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
      
    Coords.prototype.sumOfXAndY = function()
    {
        return this.x + this.y;
    }
}
  
function Display(sizeInPixels)
{
    this.sizeInPixels = sizeInPixels;
}
{
    Display.prototype.drawMap = function(map)
    {
        var mapSizeInCells = map.sizeInCells;
          
        var mapCellSizeInPixels = this.sizeInPixels.clone().divide
        (
            mapSizeInCells
        );
          
        var mapCellPos = new Coords(0, 0);
        var drawPos = new Coords(0, 0);
          
        for (var y = 0; y < mapSizeInCells.y; y++)
        {
            mapCellPos.y = y;
              
            for (var x = 0; x < mapSizeInCells.x; x++)
            {
                mapCellPos.x = x;
                  
                var mapCellAtPos = map.cellAtPos
                (
                    mapCellPos
                );
                  
                drawPos.overwriteWith
                (
                    mapCellPos
                ).multiply
                (
                    mapCellSizeInPixels
                );
                  
                //this.graphics.fillStyle = mapCellAtPos.obstacle ? "Green" : "Blue";
                this.graphics.fillRect
                (
                    drawPos.x,
                    drawPos.y,
                    mapCellSizeInPixels.x,
                    mapCellSizeInPixels.y
                );
              
            }
        }
    }
  
    Display.prototype.drawPath = function(path)
    {
        var map = path.map;
        this.drawMap(map);
          
        var mapSizeInCells = map.sizeInCells;
        var mapCellSizeInPixels = this.sizeInPixels.clone().divide
        (
            mapSizeInCells
        );
          
        var mapCellSizeInPixelsHalf = 
        mapCellSizeInPixels.clone().divideScalar(2);
          
        var pathNodes = path.nodes;
          
        var pathNode = pathNodes[0];
          
        var drawPos = new Coords();
        drawPos.overwriteWith
        (
            pathNode.cellPos
        ).multiply
        (
            mapCellSizeInPixels
        ).add
        (
            mapCellSizeInPixelsHalf
        );
          
        this.graphics.strokeStyle = "Red";
        this.graphics.beginPath();
        this.graphics.moveTo(drawPos.x, drawPos.y);
          
        for (var i = 1; i < pathNodes.length; i++)
        {
            pathNode = pathNodes[i];
            drawPos.overwriteWith
            (
                pathNode.cellPos
            ).multiply
            (
                mapCellSizeInPixels
            ).add
            (
                mapCellSizeInPixelsHalf
            );  
              
            this.graphics.lineTo
            (
                drawPos.x,
                drawPos.y
            );
        }
          
        this.graphics.stroke();
    }
      
    Display.prototype.initialize = function()
    { 
        var canvas = document.createElement("canvas");
        canvas.width = this.sizeInPixels.x;
        canvas.height = this.sizeInPixels.y;
          
        this.graphics = canvas.getContext("2d");
          
        document.body.appendChild(canvas);  
    }
}

function Globals()
{
    // do nothing
}
{
    // instance
    Globals.Instance = new Globals();
     
    // methods
 
    Globals.prototype.initialize = function(display, map, path)
    {
        this.display = display;
        this.map = map;
        this.path = path;
 
        this.display.initialize();
        this.inputHelper = new InputHelper();
        this.inputHelper.initialize();
    }
     
    Globals.prototype.update = function()
    {
        this.path.calculate();
        this.display.drawPath(this.path);
    }
}

function InputHelper()
{
    this.mouseClickPos = new Coords();
}
{
    InputHelper.prototype.initialize = function()
    {
        document.body.onmousedown = this.handleEventMouseDown.bind(this);
    }
 
    // events
 
    InputHelper.prototype.handleEventMouseDown = function(event)
    {
        this.mouseClickPos.overwriteWithXY
        (
            event.x,
            event.y
        );
         
        var map = Globals.Instance.map;
        var mapCellSizeInPixels = Globals.Instance.display.sizeInPixels.clone().divide
        (
            map.sizeInCells
        );
 
        var mouseClickPosInCells = this.mouseClickPos.clone().divide
        (
            mapCellSizeInPixels
        ).floor();
         
        var path = Globals.Instance.path;
        path.goalPos.overwriteWith(mouseClickPosInCells);
         
        Globals.Instance.update();
    }
}


function Pathfinder(cellsAsStrings)
{
    this.neighborOffsets = [ 
            new Coords(1, 0),
            new Coords(0, 1),
            new Coords(-1, 0),
            new Coords(0, -1),
			new Coords(1, 1),
			new Coords(1, -1),
			new Coords(-1, 1),
			new Coords(-1, -1)
		]; 
    this.cellsAsStrings = cellsAsStrings;
      
    this.sizeInCells = new Coords
    (
        this.cellsAsStrings[0].length, 
        this.cellsAsStrings.length
    );
    this.sizeInCellsMinusOnes = this.sizeInCells.clone().subtract
    (
        new Coords(1, 1)
    );
}
{
    Pathfinder.prototype.cellAtPos = function(cellPos)
    {
        var codeChar = this.cellsAsStrings[cellPos.y][cellPos.x];
	  
        return new MapCell(codeChar);
    }

	Pathfinder.prototype.findPath = function(startPos, destPos)
	{	  
		var path = new Path
		(
			this,
			startPos, // startPos
			destPos // goalPos
		);
		
		path.calculate();
		return path.nodes;
	}
}


function MapCell(character)
{
	this.cost = (character == "x" ? Number.POSITIVE_INFINITY : (character == "@" ? 10 : 1));
}
 
function Path(map, startPos, goalPos)
{
    this.map = map;
    this.startPos = startPos;
    this.goalPos = goalPos;
}
{
    Path.prototype.calculate = function()
    {
        var nodesToConsider = this.calculate_1_InitializeListOfNodesToConsider();
        var nodesAlreadyConsidered = [];
          
        while (nodesToConsider.length > 0)
        {
            var nodeToConsider = nodesToConsider[0];
              
            if (nodeToConsider.cellPos.equals(this.goalPos) == true)
            {   
                this.nodes = this.calculate_3_BuildListOfNodesFromStartToGoal
                (
                    nodeToConsider
                );
                break;
            }
            else
            {
                nodesToConsider.splice(0, 1);

                var nodeToConsiderID = nodeToConsider.id(this.map.sizeInCells);
                nodesAlreadyConsidered[nodeToConsiderID] = nodeToConsider;
                  
                this.calculate_2_AddNeighborsToListOfNodesToConsider
                (
                    nodeToConsider,
                    nodesToConsider,
                    nodesAlreadyConsidered
                );
            }
        }
    }
  
    Path.prototype.calculate_1_InitializeListOfNodesToConsider = function()
    {
        var nodesToConsider = [];
          
        var displacementFromStartToGoal = new Coords();
          
        displacementFromStartToGoal.overwriteWith
        (
            this.goalPos
        ).subtract
        (
            this.startPos
        );
          
        var costFromStartToGoalEstimated = 
            displacementFromStartToGoal.absolute().sumOfXAndY();
          
        var startNode = new PathNode
        (
            this.startPos, // cellPos
            0, // costFromStart
            costFromStartToGoalEstimated,
            null // prev
        );
          
        nodesToConsider.push(startNode);
          
        return nodesToConsider;
    }
      
    Path.prototype.calculate_2_AddNeighborsToListOfNodesToConsider = function
    (
        nodeToFindNeighborsOf,
        nodesToConsider,
        nodesAlreadyConsidered
    )
    {
        var mapSizeInCells = this.map.sizeInCells;
          
        var nodesNeighboring = nodeToFindNeighborsOf.neighbors(this);
          
        for (var n = 0; n < nodesNeighboring.length; n++)
        {
            var nodeNeighbor = nodesNeighboring[n];
            var nodeNeighborID = nodeNeighbor.id(mapSizeInCells);
              
            var hasNodeNeighborNotYetBeenSeen = 
            (
                nodesAlreadyConsidered[nodeNeighborID] == null 
                && nodesToConsider[nodeNeighborID] == null
            );
              
            if (hasNodeNeighborNotYetBeenSeen == true)
            {
                insertElementSortedByKeyName
                (
					nodesToConsider,
                    nodeNeighbor,
                    "costToGoalEstimated"
                );
                  
                nodesToConsider[nodeNeighborID] = nodeNeighbor;
            }
        }
    }
          
    Path.prototype.calculate_3_BuildListOfNodesFromStartToGoal = function(nodeGoal)
    {
        var returnValues = [];
          
        var nodeCurrent = nodeGoal;
          
        while (nodeCurrent != null)
        {
            returnValues.splice(0, 0, nodeCurrent);
            nodeCurrent = nodeCurrent.prev;
        }
         
        for (var i = 0; i < returnValues.length; i++)
        {
            var nodeCurrent = returnValues[i];
            if (nodeCurrent.costFromStart == Number.POSITIVE_INFINITY)
            {
                returnValues.length = i;
                break;
            }
        }
          
        return returnValues;
    }
}

function PathNode(cellPos, costFromStart, costToGoalEstimated, prev)
{
    this.cellPos = cellPos;
    this.costFromStart = costFromStart;
    this.costToGoalEstimated = costToGoalEstimated;
    this.prev = prev;
}
{
    PathNode.prototype.id = function(mapSizeInCells)
    {
        var nodeToConsiderIndex = 
            this.cellPos.y 
            * mapSizeInCells.y 
            + this.cellPos.x;
          
        var returnValue = "_" + nodeToConsiderIndex;
          
        return returnValue;
    }
      
    PathNode.prototype.neighbors = function(path)
    {
        var map = path.map;
          
        var returnValues = [];
        var mapSizeInCellsMinusOnes = map.sizeInCellsMinusOnes;
        var costToGoalTemp = new Coords();
        var neighborPos = new Coords();
          
        var neighborOffsets = map.neighborOffsets;
          
        for (var i = 0; i < neighborOffsets.length; i++)
        {
            var neighborOffset = neighborOffsets[i];
              
            neighborPos.overwriteWith
            (
                this.cellPos
            ).add
            (
                neighborOffset
            );
              
            if (neighborPos.isInRange(mapSizeInCellsMinusOnes) == true)
            {
                var neighborMapCell = map.cellAtPos(neighborPos);
                var neighborCostToTraverse = neighborMapCell.cost;
				if (neighborOffset.x != 0 && neighborOffset.y != 0) neighborCostToTraverse *= 1.74;
                  
                var neighborCostFromStart = 
                    this.costFromStart 
                    + neighborCostToTraverse;
                  
                var neighborCostToGoalEstimated = 
                    neighborCostToTraverse
                    + costToGoalTemp.overwriteWith
                    (
                        path.goalPos
                    ).subtract
                    (
                        neighborPos//this.cellPos
                    ).absolute().sumOfXAndY();
                  
                var neighborNode = new PathNode
                (
                    neighborPos.clone(),
                    neighborCostFromStart,
                    neighborCostToGoalEstimated,
                    this // prev
                );
                  
                returnValues.push(neighborNode);
            }
        }
      
        return returnValues;
    }
}
