(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
	typeof define === 'function' && define.amd ? define(factory) :
	(global.CirclePacker = factory());
}(this, (function () { 'use strict';

function sendWorkerMessage ( worker, msg ) {
	worker.postMessage( JSON.stringify( msg ) );
}

function processWorkerMessage ( event ) {
	return event.data ? JSON.parse( event.data ) : { };
}

function isCircleValid ( circle ) {
	return circle &&
		circle.id &&
		circle.radius &&
		circle.position &&
		typeof circle.position.x === 'number' &&
		typeof circle.position.y === 'number'
}

function isBoundsValid ( bounds ) {
	return bounds &&
		typeof bounds.width === 'number' &&
		typeof bounds.height === 'number'
}

// this class keeps track of the drawing loop in continuous drawing mode
// and passes messages to the worker
var CirclePacker = function CirclePacker(params) {
  if ( params === void 0 ) params = {};

  this.worker = new Worker("src/CirclePackWorker.js");
  this.worker.addEventListener(
    "message",
    this.receivedWorkerMessage.bind(this)
  );

  this.isContinuousModeActive =
    typeof params.continuousMode === "boolean" ? params.continuousMode : true;

  this.onMoveStart = params.onMoveStart || null;
  this.onMove = params.onMove || null;
  this.onMoveEnd = params.onMoveEnd || null;

  if (params.centeringPasses) {
    this.setCenteringPasses(params.centeringPasses);
  }

  if (params.collisionPasses) {
    this.setCollisionPasses(params.collisionPasses);
  }

  this.addCircles(params.circles || []);
  this.setBounds(params.bounds || { width: 100, height: 100 });
  this.setTarget(params.target || { x: 50, y: 50 });

  this.isLooping = false;
  this.areItemsMoving = true;
  this.animationFrameId = NaN;

  this.initialized = true;

  if (this.isContinuousModeActive) {
    this.startLoop();
  }
};

CirclePacker.prototype.receivedWorkerMessage = function receivedWorkerMessage (event) {
  var msg = processWorkerMessage(event);

  if (msg.type === "move") {
    var newPositions = msg.message;
    this.areItemsMoving = this.hasItemMoved(newPositions);
  }

  this.updateListeners(msg);
};

CirclePacker.prototype.updateWorker = function updateWorker (type, message) {
  sendWorkerMessage(this.worker, { type: type, message: message });
};

CirclePacker.prototype.updateListeners = function updateListeners (ref) {
    var type = ref.type;
    var message = ref.message;

  if (type === "movestart" && typeof this.onMoveStart === "function") {
    this.onMoveStart(message);
  }

  if (type === "move" && typeof this.onMove === "function") {
    this.onMove(message);
  }

  if (type === "moveend" && typeof this.onMoveEnd === "function") {
    this.onMoveEnd(message);
  }
};

CirclePacker.prototype.addCircles = function addCircles (circles) {
  if (Array.isArray(circles) && circles.length) {
    var circlesToAdd = circles.filter(isCircleValid);

    if (circlesToAdd.length) {
      this.updateWorker("addcircles", circlesToAdd);
    }
  }

  this.startLoop();
};

CirclePacker.prototype.addCircle = function addCircle (circle) {
  this.addCircles([circle]);
};

CirclePacker.prototype.removeCircle = function removeCircle (circle) {
  if (circle) {
    if (circle.id) {
      this.updateWorker("removecircle", circle.id);
    } else {
      this.updateWorker("removecircle", circle);
    }

    this.startLoop();
  }
};

CirclePacker.prototype.setRadius = function setRadius (id, radius) {
  if (radius > 0) {
    this.addCircle.updateWorker("radius", { id: id, radius: radius });
    this.startLoop();
  }
};

CirclePacker.prototype.setBounds = function setBounds (bounds) {
  if (isBoundsValid(bounds)) {
    this.updateWorker("bounds", bounds);
    this.startLoop();
  }
};

CirclePacker.prototype.setTarget = function setTarget (targetPos) {
  this.updateWorker("target", targetPos);
  this.startLoop();
};

CirclePacker.prototype.setCenteringPasses = function setCenteringPasses (numberOfCenteringPasses) {
  this.updateWorker("centeringpasses", numberOfCenteringPasses);
};

CirclePacker.prototype.setCollisionPasses = function setCollisionPasses (numberOfCollisionPasses) {
  this.updateWorker("collisionpasses", numberOfCollisionPasses);
};

CirclePacker.prototype.setDamping = function setDamping (damping) {
  this.updateWorker("damping", damping);
};

CirclePacker.prototype.update = function update () {
  this.updateWorker("update");
};

CirclePacker.prototype.dragStart = function dragStart (id) {
  this.updateWorker("dragstart", { id: id });
  this.startLoop();
};

CirclePacker.prototype.drag = function drag (id, position) {
  this.updateWorker("drag", { id: id, position: position });
  this.startLoop();
};

CirclePacker.prototype.dragEnd = function dragEnd (id) {
  this.updateWorker("dragend", { id: id });
  this.startLoop();
};

CirclePacker.prototype.updateLoop = function updateLoop () {
  this.update();

  if (this.isLooping) {
    if (this.areItemsMoving) {
      this.animationFrameId = requestAnimationFrame(
        this.updateLoop.bind(this)
      );
    } else {
      this.stopLoop();
    }
  }
};

CirclePacker.prototype.startLoop = function startLoop () {
  if (!this.isLooping && this.initialized && this.isContinuousModeActive) {
    this.isLooping = true;

    // in case we just added another circle:
    // keep going, even if nothing has moved since the last message from the worker
    if (this.isContinuousModeActive) {
      this.areItemsMoving = true;
    }

    this.updateListeners("movestart");
    this.animationFrameId = requestAnimationFrame(this.updateLoop.bind(this));
  }
};

CirclePacker.prototype.stopLoop = function stopLoop () {
  if (this.isLooping) {
    this.isLooping = false;
    this.updateListeners("moveend");
    cancelAnimationFrame(this.animationFrameId);
  }
};

CirclePacker.prototype.hasItemMoved = function hasItemMoved (positions) {
  var result = false;

  for (var id in positions) {
    if (
      Math.abs(positions[id].delta.x) > 0.005 &&
      Math.abs(positions[id].delta.y) > 0.005
    ) {
      result = true;
    }
  }

  return result;
};

CirclePacker.prototype.destroy = function destroy () {
  if (this.worker) {
    this.worker.terminate();
  }
  this.stopLoop();

  this.onMove = null;
  this.onMoveStart = null;
  this.onMoveEnd = null;
};

return CirclePacker;

})));
