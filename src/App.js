import React, { useState } from 'react';
import './App.css';
import World from './World.tsx';
import Console from './Console.tsx';
import { parseCommand } from './parser';

const sizeHeightMap = {
  small: 0.35,
  medium: 0.5,
  large: 0.7,
};

const HOLD_LIFT = 0.6;
const LATERAL_GAP = 1.4;

const createObject = ({ id, type, size, color, x, z }) => {
  const basePosition = [x, sizeHeightMap[size], z];

  return {
    id,
    type,
    size,
    color,
    position: [...basePosition],
    basePosition,
    isHeld: false,
  };
};

const createLogEntry = (type, text) => ({ type, text });
const createObjectId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const POSITION_EPSILON = 0.001;

function App() {
  const [objects, setObjects] = useState([
    createObject({ id: 'initial-1', type: 'cube', size: 'large', color: 'red', x: -2.5, z: -1.5 }),
    createObject({ id: 'initial-2', type: 'sphere', size: 'medium', color: 'blue', x: 0, z: 1.5 }),
    createObject({ id: 'initial-3', type: 'cone', size: 'small', color: 'yellow', x: 2.5, z: -0.5 }),
    createObject({ id: 'initial-4', type: 'cube', size: 'medium', color: 'green', x: -0.5, z: -3 }),
    createObject({ id: 'initial-5', type: 'sphere', size: 'large', color: 'orange', x: 3, z: 2.5 }),
  ]);
  const [logs, setLogs] = useState([
    createLogEntry('system', 'SHRDLU system online.'),
    createLogEntry('system', 'World seeded with sample objects.'),
    createLogEntry('system', 'Supported shapes: cube, sphere, cone.'),
    createLogEntry('system', 'Supported sizes: small, medium, large.'),
    createLogEntry('system', 'Supported colors: red, yellow, orange, green, blue.'),
    createLogEntry('system', 'Parser ready for object, command, and location references.'),
  ]);
  const [parserMemory, setParserMemory] = useState({});
  const [heldObjectId, setHeldObjectId] = useState(null);

  const formatReference = (reference) => {
    if (!reference) {
      return 'none';
    }

    if (reference.kind === 'pronoun') {
      return reference.pronoun;
    }

    const parts = [reference.size, reference.color, reference.shape].filter(Boolean);
    return parts.length ? parts.join(' ') : reference.raw || 'unspecified object';
  };

  const buildParseLogs = (result) => {
    const nextLogs = [createLogEntry('system', `TOKENS: ${result.tokens.join(' | ')}`)];

    result.clauses.forEach((clause, index) => {
      nextLogs.push(
        createLogEntry(
          'system',
          `CLAUSE ${index + 1}: action=${clause.action}; object=${formatReference(clause.directObject)}; object_resolution=${clause.directResolution.summary}`
        )
      );

      if (clause.location) {
        nextLogs.push(
          createLogEntry(
            'system',
            `CLAUSE ${index + 1}: location=${clause.location.relation}; target=${formatReference(clause.location.target)}; target_resolution=${clause.location.resolution.summary}`
          )
        );
      }
    });

    return nextLogs;
  };

  const describeObject = (object) => `${object.size} ${object.color} ${object.type}`;
  const getHalfHeight = (object) => object.basePosition[1];
  const getGroundedPosition = (object) => [object.basePosition[0], sizeHeightMap[object.size], object.basePosition[2]];
  const isStackingRelation = (relation) => relation === 'on' || relation === 'onto' || relation === 'on_top_of';
  const canBePlacedOnObject = (object) => object.type === 'cube' || object.type === 'cone';
  const canSupportPlacedObject = (object) => object.type === 'cube';
  const positionsMatch = (a, b) => Math.abs(a - b) < POSITION_EPSILON;

  const isDirectlyOnTopOf = (upperObject, lowerObject) => {
    const [upperX, upperY, upperZ] = upperObject.basePosition;
    const [lowerX, lowerY, lowerZ] = lowerObject.basePosition;
    const expectedUpperY = lowerY + getHalfHeight(lowerObject) + getHalfHeight(upperObject);

    return (
      positionsMatch(upperX, lowerX) &&
      positionsMatch(upperZ, lowerZ) &&
      positionsMatch(upperY, expectedUpperY)
    );
  };

  const getObjectsStackedOnTopOf = (workingObjects, baseObject) => {
    const stackedObjects = [];
    const queue = [baseObject];
    const seen = new Set([baseObject.id]);

    while (queue.length) {
      const currentBase = queue.shift();
      const directChildren = workingObjects.filter(
        (candidate) => !seen.has(candidate.id) && isDirectlyOnTopOf(candidate, currentBase)
      );

      directChildren.forEach((child) => {
        seen.add(child.id);
        stackedObjects.push(child);
        queue.push(child);
      });
    }

    return stackedObjects.sort((left, right) => right.basePosition[1] - left.basePosition[1]);
  };

  const getPlacementPosition = (movingObject, relation, targetObject) => {
    const [targetX, , targetZ] = targetObject.basePosition;
    const movingHalfHeight = getHalfHeight(movingObject);
    const targetHalfHeight = getHalfHeight(targetObject);

    switch (relation) {
      case 'left_of':
        return [targetX - LATERAL_GAP, movingHalfHeight, targetZ];
      case 'right_of':
        return [targetX + LATERAL_GAP, movingHalfHeight, targetZ];
      case 'in_front_of':
        return [targetX, movingHalfHeight, targetZ - LATERAL_GAP];
      case 'behind':
        return [targetX, movingHalfHeight, targetZ + LATERAL_GAP];
      case 'on':
      case 'onto':
      case 'on_top_of':
        return [targetX, targetHalfHeight * 2 + movingHalfHeight, targetZ];
      case 'in':
      case 'next_to':
      default:
        return [targetX + LATERAL_GAP, movingHalfHeight, targetZ];
    }
  };

  const buildObjectFromReference = (reference) => {
    const type = reference.shape;
    const size = reference.size ?? 'medium';
    const color = reference.color ?? 'green';

    if (!type) {
      return null;
    }

    return createObject({
      id: createObjectId(),
      type,
      size,
      color,
      x: Math.random() * 6 - 3,
      z: Math.random() * 6 - 3,
    });
  };

  const releaseHeldObject = (workingObjects, targetId) => {
    if (!targetId) {
      return { objects: workingObjects, heldObjectId: null, releasedObject: null };
    }

    let releasedObject = null;

    const nextObjects = workingObjects.map((object) => {
      if (object.id !== targetId) {
        return object;
      }

      releasedObject = {
        ...object,
        isHeld: false,
        position: [...object.basePosition],
      };

      return releasedObject;
    });

    return {
      objects: nextObjects,
      heldObjectId: null,
      releasedObject,
    };
  };

  const dropStackedObjectsToGround = (workingObjects, baseObject) => {
    const stackedObjects = getObjectsStackedOnTopOf(workingObjects, baseObject);

    if (!stackedObjects.length) {
      return {
        objects: workingObjects,
        droppedObjects: [],
      };
    }

    const droppedIds = new Set(stackedObjects.map((object) => object.id));
    const nextObjects = workingObjects.map((object) => {
      if (!droppedIds.has(object.id)) {
        return object;
      }

      const groundedPosition = getGroundedPosition(object);
      return {
        ...object,
        basePosition: groundedPosition,
        position: groundedPosition,
      };
    });

    return {
      objects: nextObjects,
      droppedObjects: stackedObjects,
    };
  };

  const placeObjectOnGround = (workingObjects, currentHeldObjectId, movingObject) => {
    const groundedPosition = getGroundedPosition(movingObject);
    let placedObject = null;

    const nextObjects = workingObjects.map((object) => {
      if (object.id !== movingObject.id) {
        return object;
      }

      placedObject = {
        ...object,
        isHeld: false,
        basePosition: groundedPosition,
        position: groundedPosition,
      };

      return placedObject;
    });

    return {
      objects: nextObjects,
      heldObjectId: currentHeldObjectId === movingObject.id ? null : currentHeldObjectId,
      placedObject,
    };
  };

  const pickUpObject = (workingObjects, currentHeldObjectId, targetObject) => {
    let releasedDescription = null;
    let nextObjects = workingObjects;
    let droppedObjects = [];

    if (currentHeldObjectId && currentHeldObjectId !== targetObject.id) {
      const releaseResult = releaseHeldObject(workingObjects, currentHeldObjectId);
      nextObjects = releaseResult.objects;
      if (releaseResult.releasedObject) {
        releasedDescription = describeObject(releaseResult.releasedObject);
      }
    }

    const dropResult = dropStackedObjectsToGround(nextObjects, targetObject);
    nextObjects = dropResult.objects;
    droppedObjects = dropResult.droppedObjects;

    nextObjects = nextObjects.map((object) => {
      if (object.id !== targetObject.id) {
        return object;
      }

      return {
        ...object,
        isHeld: true,
        position: [
          object.basePosition[0],
          object.basePosition[1] + HOLD_LIFT,
          object.basePosition[2],
        ],
      };
    });

    return {
      objects: nextObjects,
      heldObjectId: targetObject.id,
      releasedDescription,
      droppedObjects,
    };
  };

  const placeHeldObject = (workingObjects, currentHeldObjectId, movingObject, relation, targetObject) => {
    const nextBasePosition = getPlacementPosition(movingObject, relation, targetObject);
    let placedObject = null;

    const nextObjects = workingObjects.map((object) => {
      if (object.id !== movingObject.id) {
        return object;
      }

      placedObject = {
        ...object,
        isHeld: false,
        basePosition: [...nextBasePosition],
        position: [...nextBasePosition],
      };

      return placedObject;
    });

    return {
      objects: nextObjects,
      heldObjectId: currentHeldObjectId === movingObject.id ? null : currentHeldObjectId,
      placedObject,
    };
  };

  const executeAction = (clause, workingObjects, currentHeldObjectId, workingMemory) => {
    const findObjectById = (id) => workingObjects.find((object) => object.id === id);

    if (clause.action === 'add') {
      const newObject = buildObjectFromReference(clause.directObject);

      if (!newObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'Error. Please specify a shape to add: cube, sphere, or cone.')],
        };
      }

      return {
        handled: true,
        objects: [...workingObjects, newObject],
        heldObjectId: currentHeldObjectId,
        memory: { ...workingMemory, lastSingular: newObject },
        logs: [createLogEntry('system', `OK. I added a ${describeObject(newObject)}.`)],
      };
    }

    if (clause.action === 'remove') {
      if (clause.directResolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't remove that because the object reference is ${clause.directResolution.status}.`)],
        };
      }

      const targetObject = findObjectById(clause.directResolution.matches[0].id);
      if (!targetObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I could not find that object in the world anymore.')],
        };
      }

      return {
        handled: true,
        objects: workingObjects.filter((object) => object.id !== targetObject.id),
        heldObjectId: currentHeldObjectId === targetObject.id ? null : currentHeldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: workingMemory.lastSingular?.id === targetObject.id ? null : workingMemory.lastSingular,
        },
        logs: [createLogEntry('system', `OK. I removed the ${describeObject(targetObject)}.`)],
      };
    }

    if (clause.action === 'pick_up') {
      if (clause.directResolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't pick that up because the object reference is ${clause.directResolution.status}.`)],
        };
      }

      const targetObject = findObjectById(clause.directResolution.matches[0].id);
      if (!targetObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I could not find that object in the world anymore.')],
        };
      }

      if (currentHeldObjectId === targetObject.id) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I am already holding the ${describeObject(targetObject)}.`)],
        };
      }

      const pickUpResult = pickUpObject(workingObjects, currentHeldObjectId, targetObject);
      const nextLogs = [];

      if (pickUpResult.releasedDescription) {
        nextLogs.push(createLogEntry('system', `OK. I put down the ${pickUpResult.releasedDescription}.`));
      }

      pickUpResult.droppedObjects.forEach((droppedObject) => {
        nextLogs.push(
          createLogEntry(
            'system',
            `OK. I placed the ${describeObject(droppedObject)} on the ground before moving the ${describeObject(targetObject)}.`
          )
        );
      });

      nextLogs.push(createLogEntry('system', `OK. I picked up the ${describeObject(targetObject)}.`));

      return {
        handled: true,
        objects: pickUpResult.objects,
        heldObjectId: pickUpResult.heldObjectId,
        memory: { ...workingMemory, lastSingular: targetObject },
        logs: nextLogs,
      };
    }

    if (clause.action === 'put_down') {
      if (!currentHeldObjectId) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I am not holding anything.')],
        };
      }

      const releaseResult = releaseHeldObject(workingObjects, currentHeldObjectId);
      return {
        handled: true,
        objects: releaseResult.objects,
        heldObjectId: releaseResult.heldObjectId,
        memory: workingMemory,
        logs: releaseResult.releasedObject
          ? [createLogEntry('system', `OK. I put down the ${describeObject(releaseResult.releasedObject)}.`)]
          : [],
      };
    }

    if (clause.action === 'put' || clause.action === 'place' || clause.action === 'move') {
      if (!currentHeldObjectId) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I need to be holding an object before I can place it.')],
        };
      }

      if (!clause.location) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I need a destination such as next to, behind, or on top of another object.')],
        };
      }

      if (clause.location.resolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't place that because the location target is ${clause.location.resolution.status}.`)],
        };
      }

      const movingObject = findObjectById(currentHeldObjectId);
      const locationMatch = clause.location.resolution.matches[0];
      const targetObject = locationMatch.id === 'ground' ? null : findObjectById(locationMatch.id);

      if (!movingObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: null,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I lost track of the object I was holding.')],
        };
      }

      if (locationMatch.id !== 'ground' && !targetObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I could not find the destination object in the world anymore.')],
        };
      }

      if (locationMatch.id === 'ground') {
        const placementResult = placeObjectOnGround(workingObjects, currentHeldObjectId, movingObject);
        return {
          handled: true,
          objects: placementResult.objects,
          heldObjectId: placementResult.heldObjectId,
          memory: {
            ...workingMemory,
            lastSingular: placementResult.placedObject ?? workingMemory.lastSingular,
          },
          logs: placementResult.placedObject
            ? [createLogEntry('system', `OK. I placed the ${describeObject(placementResult.placedObject)} on the ground.`)]
            : [],
        };
      }

      if (movingObject.id === targetObject.id) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I cannot place an object relative to itself.')],
        };
      }

      if (isStackingRelation(clause.location.relation) && !canBePlacedOnObject(movingObject)) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I cannot place the ${describeObject(movingObject)} on another object.`)],
        };
      }

      if (isStackingRelation(clause.location.relation) && !canSupportPlacedObject(targetObject)) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I cannot place anything on the ${describeObject(targetObject)}.`)],
        };
      }

      const placementResult = placeHeldObject(workingObjects, currentHeldObjectId, movingObject, clause.location.relation, targetObject);
      return {
        handled: true,
        objects: placementResult.objects,
        heldObjectId: placementResult.heldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: placementResult.placedObject ?? workingMemory.lastSingular,
        },
        logs: placementResult.placedObject
          ? [
              createLogEntry(
                'system',
                `OK. I placed the ${describeObject(placementResult.placedObject)} ${clause.location.relation.replaceAll('_', ' ')} the ${describeObject(targetObject)}.`
              ),
            ]
          : [],
      };
    }

    return {
      handled: false,
      objects: workingObjects,
      heldObjectId: currentHeldObjectId,
      memory: workingMemory,
      logs: [],
    };
  };

  const handleCommand = (cmd) => {
    const userEntry = createLogEntry('user', cmd);
    const parsed = parseCommand(cmd, objects, parserMemory);
    const parseLogs = buildParseLogs(parsed);

    let workingObjects = objects;
    let workingHeldObjectId = heldObjectId;
    let workingMemory = parsed.memory;
    let handledAnyClause = false;
    const executionLogs = [];

    parsed.clauses.forEach((clause) => {
      const result = executeAction(clause, workingObjects, workingHeldObjectId, workingMemory);

      if (result.handled) {
        handledAnyClause = true;
      }

      workingObjects = result.objects;
      workingHeldObjectId = result.heldObjectId;
      workingMemory = result.memory;
      executionLogs.push(...result.logs);
    });

    setObjects(workingObjects);
    setHeldObjectId(workingHeldObjectId);
    setParserMemory(workingMemory);
    setLogs((prev) => {
      const nextLogs = [...prev, userEntry, ...parseLogs, ...executionLogs];

      if (!handledAnyClause) {
        if (parsed.clauses.some((clause) => clause.action !== 'unknown')) {
          nextLogs.push(createLogEntry('system', 'OK. I parsed the command into actions, object references, and location references.'));
        } else {
          nextLogs.push(createLogEntry('system', "I don't understand that command yet."));
        }
      }

      return nextLogs;
    });
  };

  return (
    <div className="App">
      <World objects={objects} />
      <Console logs={logs} onCommand={handleCommand} />
    </div>
  );
}

export default App;
