CirclePackJS - N00bs Pwned. Circles Packed.
============
`CirclePackJS` is a Circle-Packing algorithm for javascript.

#### How To Use
Create N Circles, and add them to a div you already created (in thise case, #touchArea)
`
var container = document.getElementById("touchArea");
var amountOfCircles = 45;
			
// Define the bounding box where the circles will live
// (Note: im not updating bounds for you on resize, just update the .bounds property inside PackedCircleManager)
this.bounds= {left: 0, top: 0, right: $(window).width(), bottom: $(window).height()}; // Use the whole window size for my case
// this.bounds= {left: 0, top: 0, right: container.style.width, bottom:  600 }; // Or Maybe for you use the container div size if you like - 

// Initialize the PackedCircleManager
this.circleManager = new PackedCircleManager();
this.circleManager.setBounds(this.bounds);

// Create N circles
for(var i = 0; i < amountOfCircles; i++)
{
	var radius = Math.floor(Math.random() * 50) + 20;
	var diameter = radius*2;

	var aCircleDiv = document.createElement('div');
	aCircleDiv.className = 'packedCircle';
	aCircleDiv.id = 'circ_'+i;
	aCircleDiv.style.width = diameter+"px";
	aCircleDiv.style.height = diameter+"px";

	$(aCircleDiv).css('background-image', "url(./images/circle-"+Math.floor(Math.random() * 7)+".png)");
	$(aCircleDiv).css('background-position', 'center');
	// [Mozilla] : Scale the background width
	$(aCircleDiv).css('-moz-background-size', (radius*2) + "px" + " " + (radius*2) + "px");

	// Create the packed circle, and add it to our lists
	var aPackedCircle = new PackedCircle(aCircleDiv, radius);
	this.circleManager.addCircle(aPackedCircle);
	container.appendChild(aCircleDiv);
}
`

Now just call this whenever you want, for example on interval, to update the div positions
`
/**
 * Updates the positions of the circles divs and runs the collision & target chasing
 */
function updateCircles()
{
	this.circleManager.pushAllCirclesTowardTarget(this.circleManager.desiredTarget); // Push all the circles to the target - in my case the center of the bounds
	this.circleManager.handleCollisions();    // Make the circles collide and adjust positions to move away from each other

	// Position circles based on new position
	var circleArray = this.circleManager.allCircles;
	var len = circleArray.length;

	for(var i = 0; i < len; i++)
	{
		var aCircle = circleArray[i];
		this.circleManager.handleBoundaryForCircle(aCircle); // Wrap the circles packman style in my case. Look in the function to see different options

		// Get the position
		var xpos = aCircle.position.x - aCircle.radius;
		var ypos = aCircle.position.y - aCircle.radius;

		var delta = aCircle.previousPosition.distanceSquared(aCircle.position);

		// Anything else we won't bother asking the browser to re-render
		if(delta > -0.01) // bug - for now we always re-render
		{
			var circleDiv = document.getElementById("circ_"+i);

			// Matrix translate the position of the object in webkit & firefox
			circleDiv.style.webkitTransform ="translate3d("+xpos+"px,"+ypos+"px, 0px)";
			circleDiv.style.MozTransform ="translate("+xpos+"px,"+ypos+"px)";

			// [CrossBrowser] : Use jQuery to move the object - uncomment this if all else fails. Very slow.
			//$(aCircle.div).offset({left: xpos, top: ypos});

			// [Mozilla] : Recenter background
			if(aCircle.radius > aCircle.originalRadius)
			{
				var backgroundPostionString = (aCircle.radius*2) + "px" + " " + (aCircle.radius*2) + "px";
				$(circleDiv.div).css('-moz-background-size', backgroundPostionString);
			}
		}

		// Store the old position for next time
		aCircle.previousPosition = aCircle.position.cp();
	}
}
`

### Note
`
// Where you see, [Browser Name], it means im doing something just for that browser and making a note of it
`

### Credits
Mario Gonzalez &lt;mariogonzalez@gmail.com&gt;

### License
MIT