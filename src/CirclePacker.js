import {
  sendWorkerMessage,
  processWorkerMessage,
  isCircleValid,
  isBoundsValid
} from "./util.js";

// this class keeps track of the drawing loop in continuous drawing mode
// and passes messages to the worker
export default class CirclePacker {
  constructor(params = {}) {
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
  }

  receivedWorkerMessage(event) {
    const msg = processWorkerMessage(event);

    if (msg.type === "move") {
      const newPositions = msg.message;
      this.areItemsMoving = this.hasItemMoved(newPositions);
    }

    this.updateListeners(msg);
  }

  updateWorker(type, message) {
    sendWorkerMessage(this.worker, { type, message });
  }

  updateListeners({ type, message }) {
    if (type === "movestart" && typeof this.onMoveStart === "function") {
      this.onMoveStart(message);
    }

    if (type === "move" && typeof this.onMove === "function") {
      this.onMove(message);
    }

    if (type === "moveend" && typeof this.onMoveEnd === "function") {
      this.onMoveEnd(message);
    }
  }

  addCircles(circles) {
    if (Array.isArray(circles) && circles.length) {
      const circlesToAdd = circles.filter(isCircleValid);

      if (circlesToAdd.length) {
        this.updateWorker("addcircles", circlesToAdd);
      }
    }

    this.startLoop();
  }

  addCircle(circle) {
    this.addCircles([circle]);
  }

  removeCircle(circle) {
    if (circle) {
      if (circle.id) {
        this.updateWorker("removecircle", circle.id);
      } else {
        this.updateWorker("removecircle", circle);
      }

      this.startLoop();
    }
  }

  setRadius(id, radius) {
    if (radius > 0) {
      this.addCircle.updateWorker("radius", { id, radius });
      this.startLoop();
    }
  }

  setBounds(bounds) {
    if (isBoundsValid(bounds)) {
      this.updateWorker("bounds", bounds);
      this.startLoop();
    }
  }

  setTarget(targetPos) {
    this.updateWorker("target", targetPos);
    this.startLoop();
  }

  setCenteringPasses(numberOfCenteringPasses) {
    this.updateWorker("centeringpasses", numberOfCenteringPasses);
  }

  setCollisionPasses(numberOfCollisionPasses) {
    this.updateWorker("collisionpasses", numberOfCollisionPasses);
  }

  setDamping(damping) {
    this.updateWorker("damping", damping);
  }

  update() {
    this.updateWorker("update");
  }

  dragStart(id) {
    this.updateWorker("dragstart", { id });
    this.startLoop();
  }

  drag(id, position) {
    this.updateWorker("drag", { id, position });
    this.startLoop();
  }

  dragEnd(id) {
    this.updateWorker("dragend", { id });
    this.startLoop();
  }

  updateLoop() {
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
  }

  startLoop() {
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
  }

  stopLoop() {
    if (this.isLooping) {
      this.isLooping = false;
      this.updateListeners("moveend");
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  hasItemMoved(positions) {
    let result = false;

    for (let id in positions) {
      if (
        Math.abs(positions[id].delta.x) > 0.005 &&
        Math.abs(positions[id].delta.y) > 0.005
      ) {
        result = true;
      }
    }

    return result;
  }

  destroy() {
    if (this.worker) {
      this.worker.terminate();
    }
    this.stopLoop();

    this.onMove = null;
    this.onMoveStart = null;
    this.onMoveEnd = null;
  }
}
