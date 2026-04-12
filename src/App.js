import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import World from './World.tsx';
import Console from './Console.tsx';
import { parseCommand } from './parser';
import {
  createClientSessionId,
  deleteSessionByName,
  listSessions,
  loadLatestSession,
  loadSessionByName,
  saveSession,
} from './lib/sessionStore';

const objectHalfHeightMap = {
  small: 0.35,
  medium: 0.5,
  large: 0.7,
};
const boxInteriorSizeMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
  jumbo: 3.1,
};
const boxInteriorHeightMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
  jumbo: 1.4,
};
const boxWallThicknessMap = {
  small: 0.1,
  medium: 0.12,
  large: 0.16,
  jumbo: 0.2,
};
const getObjectHalfHeightByType = (type, size) =>
  type === 'box'
    ? (boxInteriorHeightMap[size] + boxWallThicknessMap[size]) / 2
    : objectHalfHeightMap[size];

const HOLD_LIFT = 0.6;
const LATERAL_GAP = 1.4;
const COMMAND_HISTORY_LIMIT = 25;
const SHAPES = ['cube', 'sphere', 'cone', 'box'];
const NON_BOX_SIZES = ['small', 'medium', 'large'];
const BOX_SIZES = ['small', 'medium', 'large', 'jumbo'];
const COLORS = ['red', 'yellow', 'orange', 'green', 'blue'];
const DEFAULT_SCENE_COUNT = 5;
const BOX_CONSTRAINTS = {
  small: { capacity: 1, maxItemSize: 'small' },
  medium: { capacity: 1, maxItemSize: 'medium' },
  large: { capacity: 1, maxItemSize: 'large' },
  jumbo: { capacity: 4, maxItemSize: 'large' },
};
const SIZE_RANK = {
  small: 1,
  medium: 2,
  large: 3,
  jumbo: 4,
};

const createObject = ({ id, type, size, color, x, z }) => {
  const basePosition = [x, getObjectHalfHeightByType(type, size), z];

  return {
    id,
    type,
    size,
    color,
    position: [...basePosition],
    basePosition,
    isHeld: false,
    containerId: null,
  };
};

const createLogEntry = (type, text) => ({ type, text });
const createObjectId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const POSITION_EPSILON = 0.001;
const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];
const getPlacementRange = (count) => Math.max(3, Math.ceil(Math.sqrt(Math.max(count, 1))) * 1.8);
const getRandomCoordinate = (count) => {
  const range = getPlacementRange(count);
  return Math.random() * range * 2 - range;
};
const createSeededObjects = (count) =>
  Array.from({ length: count }, () =>
    {
      const type = pickRandom(SHAPES);
      return createObject({
        id: createObjectId(),
        type,
        size: pickRandom(type === 'box' ? BOX_SIZES : NON_BOX_SIZES),
        color: pickRandom(COLORS),
        x: getRandomCoordinate(count),
        z: getRandomCoordinate(count),
      });
    }
  );

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
    createLogEntry('system', 'Supported shapes: cube, sphere, cone, box.'),
    createLogEntry('system', 'Supported sizes: small, medium, large, plus jumbo boxes.'),
    createLogEntry('system', 'Supported colors: red, yellow, orange, green, blue.'),
    createLogEntry('system', 'Parser ready for object, command, and location references.'),
  ]);
  const [parserMemory, setParserMemory] = useState({});
  const [heldObjectId, setHeldObjectId] = useState(null);
  const [commandHistory, setCommandHistory] = useState([]);
  const [activeSessionName, setActiveSessionName] = useState(null);
  const [isHelpOpen, setIsHelpOpen] = useState(true);
  const sessionIdRef = useRef(createClientSessionId());

  useEffect(() => {
    let isMounted = true;

    loadLatestSession().then((result) => {
      if (!isMounted || !result.ok || !result.data) {
        if (!isMounted || result.skipped || result.ok) {
          return;
        }

        setLogs((prev) => [
          ...prev,
          createLogEntry('system', `Session autoload failed: ${result.error.message}.`),
        ]);
        return;
      }

      const restoredLogs = Array.isArray(result.data.logs) ? result.data.logs : [];
      const restoredObjects = Array.isArray(result.data.objects) ? syncContainedObjects(result.data.objects) : [];
      const restoredHistory = Array.isArray(result.data.command_history)
        ? result.data.command_history.slice(-COMMAND_HISTORY_LIMIT)
        : [];

      sessionIdRef.current = result.data.client_session_id || sessionIdRef.current;
      setObjects(restoredObjects);
      setHeldObjectId(result.data.held_object_id ?? null);
      setParserMemory(result.data.parser_memory ?? {});
      setCommandHistory(restoredHistory);
      setActiveSessionName(result.data.session_name ?? null);
      setLogs([
        ...restoredLogs,
        createLogEntry(
          'system',
          result.data.session_name
            ? `Restored the saved session "${result.data.session_name}".`
            : 'Restored the most recent saved session.'
        ),
      ]);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHelpOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsHelpOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isHelpOpen]);

  const formatReference = (reference) => {
    if (!reference) {
      return 'none';
    }

    if (reference.kind === 'ground') {
      return 'ground';
    }

    if (reference.kind === 'pronoun') {
      return reference.pronoun;
    }

    const negativeParts = [
      ...(reference.excludedSizes ?? []).map((value) => `not ${value}`),
      ...(reference.excludedColors ?? []).map((value) => `not ${value}`),
      ...(reference.excludedShapes ?? []).map((value) => `not ${value}`),
    ];
    const baseParts = [reference.size, reference.color, reference.shape, ...negativeParts].filter(Boolean);
    const baseLabel = baseParts.length ? baseParts.join(' ') : reference.raw || 'unspecified object';

    if (!reference.specifiers?.length) {
      return baseLabel;
    }

    const specifierLabel = reference.specifiers
      .map((specifier) => `${specifier.relation.replaceAll('_', ' ')} ${formatReference(specifier.target)}`)
      .join(' ');

    return `${baseLabel} ${specifierLabel}`.trim();
  };

  const buildParseLogs = (result) => {
    const nextLogs = [createLogEntry('system', `TOKENS: ${result.tokens.join(' | ')}`)];

    result.clauses.forEach((clause, index) => {
      if (clause.action === 'new_scene') {
        nextLogs.push(
          createLogEntry(
            'system',
            `CLAUSE ${index + 1}: action=${clause.action}; scene_count=${clause.sceneCount ?? 'default'}`
          )
        );
        return;
      }

      if (
        clause.action === 'help' ||
        clause.action === 'save_session' ||
        clause.action === 'load_session' ||
        clause.action === 'delete_session' ||
        clause.action === 'list_sessions'
      ) {
        nextLogs.push(
          createLogEntry(
            'system',
            `CLAUSE ${index + 1}: action=${clause.action}; session_name=${clause.sessionName ?? 'none'}`
          )
        );
        return;
      }

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
  const formatObjectList = (items) => {
    if (!items.length) {
      return '';
    }

    if (items.length === 1) {
      return describeObject(items[0]);
    }

    if (items.length === 2) {
      return `${describeObject(items[0])} and ${describeObject(items[1])}`;
    }

    return `${items.slice(0, -1).map(describeObject).join(', ')}, and ${describeObject(items[items.length - 1])}`;
  };
  const formatCoordinate = (value) => {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded) ? `${rounded}.0` : `${rounded}`;
  };
  const isBox = (object) => object?.type === 'box';
  const getSizeRank = (size) => SIZE_RANK[size] ?? 0;
  const getHalfHeight = (object) => getObjectHalfHeightByType(object.type, object.size);
  const getGroundedPosition = (object) => [object.basePosition[0], getHalfHeight(object), object.basePosition[2]];
  const isStackingRelation = (relation) => relation === 'on' || relation === 'onto' || relation === 'on_top_of';
  const canBePlacedOnObject = (object) => object.type === 'cube' || object.type === 'cone' || object.type === 'box';
  const canSupportPlacedObject = (object) => object.type === 'cube';
  const positionsMatch = (a, b) => Math.abs(a - b) < POSITION_EPSILON;
  const getObjectsInContainer = (workingObjects, containerId) =>
    workingObjects.filter((object) => object.containerId === containerId);
  const getDescendantIds = (workingObjects, rootId) => {
    const descendantIds = new Set();
    const queue = [rootId];

    while (queue.length) {
      const currentId = queue.shift();
      workingObjects.forEach((object) => {
        if (object.containerId === currentId && !descendantIds.has(object.id)) {
          descendantIds.add(object.id);
          queue.push(object.id);
        }
      });
    }

    return descendantIds;
  };
  const getContainerAnchorPosition = (container) => (container.isHeld ? container.position : container.basePosition);
  const describeObjectLocation = (object, workingObjects) => {
    if (object.isHeld) {
      return `The ${describeObject(object)} is currently being held.`;
    }

    if (object.containerId) {
      const container = workingObjects.find((candidate) => candidate.id === object.containerId);
      if (container) {
        return `The ${describeObject(object)} is in the ${describeObject(container)}.`;
      }
    }

    const supportingObject = workingObjects.find((candidate) => candidate.id !== object.id && isDirectlyOnTopOf(object, candidate));
    if (supportingObject) {
      return `The ${describeObject(object)} is on top of the ${describeObject(supportingObject)}.`;
    }

    return `The ${describeObject(object)} is on the ground near x=${formatCoordinate(object.basePosition[0])}, z=${formatCoordinate(object.basePosition[2])}.`;
  };
  const getContainedBasePosition = (container, item, slotIndex) => {
    const [containerX, containerY, containerZ] = getContainerAnchorPosition(container);
    const containerHalfHeight = getHalfHeight(container);
    const itemHalfHeight = getHalfHeight(item);
    const floorY = containerY - containerHalfHeight + itemHalfHeight + 0.03;

    if (container.size !== 'jumbo') {
      return [containerX, floorY, containerZ];
    }

    const slotOffsets = [
      [-boxInteriorSizeMap.jumbo * 0.25, -boxInteriorSizeMap.jumbo * 0.25],
      [boxInteriorSizeMap.jumbo * 0.25, -boxInteriorSizeMap.jumbo * 0.25],
      [-boxInteriorSizeMap.jumbo * 0.25, boxInteriorSizeMap.jumbo * 0.25],
      [boxInteriorSizeMap.jumbo * 0.25, boxInteriorSizeMap.jumbo * 0.25],
    ];
    const [offsetX, offsetZ] = slotOffsets[slotIndex] ?? [0, 0];

    return [containerX + offsetX, floorY, containerZ + offsetZ];
  };
  const syncContainedObjects = (workingObjects) => {
    const objectMap = new Map(workingObjects.map((object) => [object.id, { ...object }]));
    const childrenByContainer = new Map();

    workingObjects.forEach((object) => {
      if (!object.containerId) {
        return;
      }

      if (!childrenByContainer.has(object.containerId)) {
        childrenByContainer.set(object.containerId, []);
      }

      childrenByContainer.get(object.containerId).push(object.id);
    });

    const syncChildren = (containerId) => {
      const container = objectMap.get(containerId);
      const childIds = childrenByContainer.get(containerId) ?? [];

      childIds.forEach((childId, slotIndex) => {
        const child = objectMap.get(childId);
        if (!container || !child) {
          return;
        }

        const basePosition = getContainedBasePosition(container, child, slotIndex);
        child.basePosition = basePosition;
        child.position = child.isHeld ? [basePosition[0], basePosition[1] + HOLD_LIFT, basePosition[2]] : [...basePosition];
        objectMap.set(childId, child);
        syncChildren(childId);
      });
    };

    workingObjects.forEach((object) => {
      if (!object.containerId) {
        syncChildren(object.id);
      }
    });

    return workingObjects.map((object) => objectMap.get(object.id) ?? object);
  };
  const canObjectFitInBox = (item, box, workingObjects) => {
    if (!isBox(box)) {
      return {
        ok: false,
        reason: `The ${describeObject(box)} is not a box.`,
      };
    }

    const constraints = BOX_CONSTRAINTS[box.size];
    const directContents = getObjectsInContainer(workingObjects, box.id);
    const occupancy = directContents.filter((candidate) => candidate.id !== item.id).length;

    if (occupancy >= constraints.capacity) {
      return {
        ok: false,
        reason: `The ${describeObject(box)} is full.`,
      };
    }

    if (getSizeRank(item.size) > getSizeRank(constraints.maxItemSize)) {
      return {
        ok: false,
        reason: `The ${describeObject(item)} is too large for the ${describeObject(box)}.`,
      };
    }

    if (item.id === box.id) {
      return {
        ok: false,
        reason: 'I cannot place an object inside itself.',
      };
    }

    if (getDescendantIds(workingObjects, item.id).has(box.id)) {
      return {
        ok: false,
        reason: 'I cannot place a box inside one of its contents.',
      };
    }

    return {
      ok: true,
      reason: null,
    };
  };

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

  const buildObjectFromReference = (reference, objectCount = 1) => {
    const type = reference.shape;
    const size = reference.size ?? 'medium';
    const color = reference.color ?? 'green';

    if (!type) {
      return null;
    }

    if (size === 'jumbo' && type !== 'box') {
      return null;
    }

    return createObject({
      id: createObjectId(),
      type,
      size,
      color,
      x: getRandomCoordinate(objectCount),
      z: getRandomCoordinate(objectCount),
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
      objects: syncContainedObjects(nextObjects),
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
        containerId: null,
        basePosition: groundedPosition,
        position: groundedPosition,
      };

      return placedObject;
    });

    return {
      objects: syncContainedObjects(nextObjects),
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
        containerId: null,
        position: [
          object.basePosition[0],
          object.basePosition[1] + HOLD_LIFT,
          object.basePosition[2],
        ],
      };
    });

    return {
      objects: syncContainedObjects(nextObjects),
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
        containerId: null,
        basePosition: [...nextBasePosition],
        position: [...nextBasePosition],
      };

      return placedObject;
    });

    return {
      objects: syncContainedObjects(nextObjects),
      heldObjectId: currentHeldObjectId === movingObject.id ? null : currentHeldObjectId,
      placedObject,
    };
  };

  const placeObjectInBox = (workingObjects, currentHeldObjectId, movingObject, boxObject) => {
    let placedObject = null;

    const nextObjects = workingObjects.map((object) => {
      if (object.id !== movingObject.id) {
        return object;
      }

      placedObject = {
        ...object,
        isHeld: false,
        containerId: boxObject.id,
      };

      return placedObject;
    });

    return {
      objects: syncContainedObjects(nextObjects),
      heldObjectId: currentHeldObjectId === movingObject.id ? null : currentHeldObjectId,
      placedObject,
    };
  };

  const shuffleObjects = (workingObjects, currentHeldObjectId) =>
    workingObjects.map((object) => {
      const objectCount = workingObjects.length;
      const basePosition = [
        getRandomCoordinate(objectCount),
        getHalfHeight(object),
        getRandomCoordinate(objectCount),
      ];

      return {
        ...object,
        basePosition,
        position: object.id === currentHeldObjectId
          ? [basePosition[0], basePosition[1] + HOLD_LIFT, basePosition[2]]
          : [...basePosition],
      };
    });

  const executeAction = (clause, workingObjects, currentHeldObjectId, workingMemory, currentActiveSessionName) => {
    const findObjectById = (id) => workingObjects.find((object) => object.id === id);
    const buildPickUpLogs = (pickUpResult, targetObject) => {
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
      return nextLogs;
    };

    if (clause.action === 'add') {
      const newObject = buildObjectFromReference(clause.directObject, workingObjects.length + 1);

      if (!newObject) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'Error. Please specify a valid object such as a cube, sphere, cone, or box. Jumbo size is only valid for boxes.')],
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

    if (clause.action === 'new_scene') {
      const sceneCount = clause.sceneCount ?? DEFAULT_SCENE_COUNT;

      if (!Number.isInteger(sceneCount) || sceneCount <= 0) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'Please provide a positive number of objects for the new scene.')],
        };
      }

      const nextObjects = createSeededObjects(sceneCount);

      return {
        handled: true,
        objects: nextObjects,
        heldObjectId: null,
        memory: {},
        logs: [createLogEntry('system', `OK. I created a new scene with ${sceneCount} objects.`)],
      };
    }

    if (clause.action === 'shuffle') {
      const nextObjects = syncContainedObjects(shuffleObjects(workingObjects, currentHeldObjectId));

      return {
        handled: true,
        objects: nextObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: currentActiveSessionName,
        logs: [createLogEntry('system', 'OK. I shuffled the object positions.')],
      };
    }

    if (clause.action === 'help') {
      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: currentActiveSessionName,
        sessionOperation: {
          type: 'help',
        },
        logs: [],
      };
    }

    if (clause.action === 'save_session') {
      if (!clause.sessionName) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          sessionName: currentActiveSessionName,
          logs: [createLogEntry('system', 'Please provide a name, for example: save session demo.')],
        };
      }

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: clause.sessionName,
        sessionOperation: {
          type: 'save',
          sessionName: clause.sessionName,
        },
        logs: [],
      };
    }

    if (clause.action === 'load_session') {
      if (!clause.sessionName) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          sessionName: currentActiveSessionName,
          logs: [createLogEntry('system', 'Please provide a session name to load.')],
        };
      }

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: currentActiveSessionName,
        sessionOperation: {
          type: 'load',
          sessionName: clause.sessionName,
        },
        logs: [],
      };
    }

    if (clause.action === 'delete_session') {
      if (!clause.sessionName) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          sessionName: currentActiveSessionName,
          logs: [createLogEntry('system', 'Please provide a session name to remove.')],
        };
      }

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: currentActiveSessionName,
        sessionOperation: {
          type: 'delete',
          sessionName: clause.sessionName,
        },
        logs: [],
      };
    }

    if (clause.action === 'list_sessions') {
      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: workingMemory,
        sessionName: currentActiveSessionName,
        sessionOperation: {
          type: 'list',
        },
        logs: [],
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

      const removedIds = getDescendantIds(workingObjects, targetObject.id);
      removedIds.add(targetObject.id);

      return {
        handled: true,
        objects: workingObjects.filter((object) => !removedIds.has(object.id)),
        heldObjectId: removedIds.has(currentHeldObjectId) ? null : currentHeldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: removedIds.has(workingMemory.lastSingular?.id) ? null : workingMemory.lastSingular,
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

      return {
        handled: true,
        objects: pickUpResult.objects,
        heldObjectId: pickUpResult.heldObjectId,
        memory: { ...workingMemory, lastSingular: targetObject },
        logs: buildPickUpLogs(pickUpResult, targetObject),
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
      const hasExplicitDirectObject = Boolean(clause.directObject?.raw || clause.directObject?.kind === 'pronoun');

      if (!currentHeldObjectId && hasExplicitDirectObject && clause.directResolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't move that because the object reference is ${clause.directResolution.status}.`)],
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

      let nextObjects = workingObjects;
      let nextHeldObjectId = currentHeldObjectId;
      let nextMemory = workingMemory;
      const actionLogs = [];
      const objectToMoveId = clause.directResolution.status === 'resolved'
        ? clause.directResolution.matches[0].id
        : currentHeldObjectId;
      let movingObject = objectToMoveId ? findObjectById(objectToMoveId) : null;
      const locationMatch = clause.location.resolution.matches[0];
      const targetObject = locationMatch.id === 'ground' ? null : findObjectById(locationMatch.id);

      if (clause.directResolution.status === 'resolved' && objectToMoveId !== currentHeldObjectId) {
        if (!movingObject) {
          return {
            handled: true,
            objects: workingObjects,
            heldObjectId: currentHeldObjectId,
            memory: workingMemory,
            logs: [createLogEntry('system', 'I could not find that object in the world anymore.')],
          };
        }

        const pickUpResult = pickUpObject(nextObjects, nextHeldObjectId, movingObject);
        nextObjects = pickUpResult.objects;
        nextHeldObjectId = pickUpResult.heldObjectId;
        nextMemory = { ...nextMemory, lastSingular: movingObject };
        actionLogs.push(...buildPickUpLogs(pickUpResult, movingObject));
        movingObject = findObjectById(nextHeldObjectId);
      }

      if (!nextHeldObjectId) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I need to be holding an object before I can place it.')],
        };
      }

      if (!movingObject) {
        return {
          handled: true,
          objects: nextObjects,
          heldObjectId: null,
          memory: nextMemory,
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
        const placementResult = placeObjectOnGround(nextObjects, nextHeldObjectId, movingObject);
        return {
          handled: true,
          objects: placementResult.objects,
          heldObjectId: placementResult.heldObjectId,
          memory: {
            ...nextMemory,
            lastSingular: placementResult.placedObject ?? workingMemory.lastSingular,
          },
          logs: placementResult.placedObject
            ? [...actionLogs, createLogEntry('system', `OK. I placed the ${describeObject(placementResult.placedObject)} on the ground.`)]
            : actionLogs,
        };
      }

      if (clause.location.relation === 'in') {
        const fitCheck = canObjectFitInBox(movingObject, targetObject, nextObjects);

        if (!fitCheck.ok) {
          return {
            handled: true,
            objects: nextObjects,
            heldObjectId: nextHeldObjectId,
            memory: nextMemory,
            logs: [...actionLogs, createLogEntry('system', fitCheck.reason)],
          };
        }

        const placementResult = placeObjectInBox(nextObjects, nextHeldObjectId, movingObject, targetObject);

        return {
          handled: true,
          objects: placementResult.objects,
          heldObjectId: placementResult.heldObjectId,
          memory: {
            ...nextMemory,
            lastSingular: placementResult.placedObject ?? nextMemory.lastSingular,
          },
          logs: placementResult.placedObject
            ? [
                ...actionLogs,
                createLogEntry(
                  'system',
                  `OK. I placed the ${describeObject(placementResult.placedObject)} in the ${describeObject(targetObject)}.`
                ),
              ]
            : actionLogs,
        };
      }

      if (movingObject.id === targetObject.id) {
        return {
          handled: true,
          objects: nextObjects,
          heldObjectId: nextHeldObjectId,
          memory: nextMemory,
          logs: [...actionLogs, createLogEntry('system', 'I cannot place an object relative to itself.')],
        };
      }

      if (isStackingRelation(clause.location.relation) && !canBePlacedOnObject(movingObject)) {
        return {
          handled: true,
          objects: nextObjects,
          heldObjectId: nextHeldObjectId,
          memory: nextMemory,
          logs: [...actionLogs, createLogEntry('system', `I cannot place the ${describeObject(movingObject)} on another object.`)],
        };
      }

      if (isStackingRelation(clause.location.relation) && !canSupportPlacedObject(targetObject)) {
        return {
          handled: true,
          objects: nextObjects,
          heldObjectId: nextHeldObjectId,
          memory: nextMemory,
          logs: [...actionLogs, createLogEntry('system', `I cannot place anything on the ${describeObject(targetObject)}.`)],
        };
      }

      const placementResult = placeHeldObject(nextObjects, nextHeldObjectId, movingObject, clause.location.relation, targetObject);
      return {
        handled: true,
        objects: placementResult.objects,
        heldObjectId: placementResult.heldObjectId,
        memory: {
          ...nextMemory,
          lastSingular: placementResult.placedObject ?? nextMemory.lastSingular,
        },
        logs: placementResult.placedObject
          ? [
              ...actionLogs,
              createLogEntry(
                'system',
                `OK. I placed the ${describeObject(placementResult.placedObject)} ${clause.location.relation.replaceAll('_', ' ')} the ${describeObject(targetObject)}.`
              ),
            ]
          : actionLogs,
      };
    }

    if (clause.action === 'query_object') {
      if (clause.directResolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't answer that because the object reference is ${clause.directResolution.status}.`)],
        };
      }

      const matches = clause.directResolution.candidates ?? clause.directResolution.matches ?? [];
      const resolvedObjects = matches
        .map((match) => findObjectById(match.id))
        .filter(Boolean);

      if (!resolvedObjects.length) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I could not find a matching object in the world anymore.')],
        };
      }

      const answer = resolvedObjects.length === 1
        ? `The matching object is the ${describeObject(resolvedObjects[0])}.`
        : `The matching objects are the ${formatObjectList(resolvedObjects)}.`;

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: resolvedObjects[0] ?? workingMemory.lastSingular,
        },
        logs: [createLogEntry('system', answer)],
      };
    }

    if (clause.action === 'query_where') {
      if (clause.directResolution.status !== 'resolved') {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `I can't answer that because the object reference is ${clause.directResolution.status}.`)],
        };
      }

      const matches = clause.directResolution.candidates ?? clause.directResolution.matches ?? [];
      const resolvedObjects = matches
        .map((match) => findObjectById(match.id))
        .filter(Boolean);

      if (!resolvedObjects.length) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', 'I could not find that object in the world anymore.')],
        };
      }

      const locationLog = resolvedObjects.length === 1
        ? describeObjectLocation(resolvedObjects[0], workingObjects)
        : `There are multiple matches: ${resolvedObjects.map((object) => describeObjectLocation(object, workingObjects)).join(' ')}`;

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: resolvedObjects[0] ?? workingMemory.lastSingular,
        },
        logs: [createLogEntry('system', locationLog)],
      };
    }

    if (clause.action === 'query_yes_no') {
      const matches = clause.directResolution.candidates ?? clause.directResolution.matches ?? [];
      const resolvedObjects = matches
        .map((match) => findObjectById(match.id))
        .filter(Boolean);

      if (!resolvedObjects.length) {
        return {
          handled: true,
          objects: workingObjects,
          heldObjectId: currentHeldObjectId,
          memory: workingMemory,
          logs: [createLogEntry('system', `No, I can't find ${formatReference(clause.directObject)}.`)],
        };
      }

      return {
        handled: true,
        objects: workingObjects,
        heldObjectId: currentHeldObjectId,
        memory: {
          ...workingMemory,
          lastSingular: resolvedObjects[0] ?? workingMemory.lastSingular,
        },
        logs: [createLogEntry('system', `Yes, ${formatReference(clause.directObject)} matches ${formatObjectList(resolvedObjects)}.`)],
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

  const applyLoadedSession = (session, successMessage) => {
    const restoredLogs = Array.isArray(session.logs) ? session.logs : [];
    const restoredObjects = Array.isArray(session.objects) ? syncContainedObjects(session.objects) : [];
    const restoredHistory = Array.isArray(session.command_history)
      ? session.command_history.slice(-COMMAND_HISTORY_LIMIT)
      : [];

    sessionIdRef.current = session.client_session_id || sessionIdRef.current;
    setObjects(restoredObjects);
    setHeldObjectId(session.held_object_id ?? null);
    setParserMemory(session.parser_memory ?? {});
    setCommandHistory(restoredHistory);
    setActiveSessionName(session.session_name ?? null);
    setLogs([
      ...restoredLogs,
      createLogEntry('system', successMessage),
    ]);
  };

  const handleCommand = async (cmd) => {
    const userEntry = createLogEntry('user', cmd);
    const parsed = parseCommand(cmd, objects, parserMemory);
    const parseLogs = buildParseLogs(parsed);

    let workingObjects = objects;
    let workingHeldObjectId = heldObjectId;
    let workingMemory = parsed.memory;
    let workingSessionName = activeSessionName;
    let handledAnyClause = false;
    const executionLogs = [];
    const sessionOperations = [];

    parsed.clauses.forEach((clause) => {
      const result = executeAction(clause, workingObjects, workingHeldObjectId, workingMemory, workingSessionName);

      if (result.handled) {
        handledAnyClause = true;
      }

      workingObjects = result.objects;
      workingHeldObjectId = result.heldObjectId;
      workingMemory = result.memory;
      workingSessionName = result.sessionName ?? workingSessionName;
      executionLogs.push(...result.logs);

      if (result.sessionOperation) {
        sessionOperations.push(result.sessionOperation);
      }
    });

    const nextLogs = [...logs, userEntry, ...parseLogs, ...executionLogs];
    const nextCommandHistory = [...commandHistory, cmd].slice(-COMMAND_HISTORY_LIMIT);

    if (!handledAnyClause) {
      if (parsed.clauses.some((clause) => clause.action !== 'unknown')) {
        nextLogs.push(createLogEntry('system', 'OK. I parsed the command into actions, object references, and location references.'));
      } else {
        nextLogs.push(createLogEntry('system', "I don't understand that command yet."));
      }
    }

    for (const operation of sessionOperations) {
      if (operation.type === 'save') {
        const saveResult = await saveSession({
          sessionId: sessionIdRef.current,
          sessionName: operation.sessionName,
          command: cmd,
          commandHistory: nextCommandHistory,
          objects: workingObjects,
          logs: nextLogs,
          parserMemory: workingMemory,
          heldObjectId: workingHeldObjectId,
        });

        if (saveResult.ok) {
          sessionIdRef.current = saveResult.data?.client_session_id || sessionIdRef.current;
          workingSessionName = operation.sessionName;
          nextLogs.push(createLogEntry('system', `OK. I saved this session as "${operation.sessionName}".`));
        } else if (saveResult.skipped) {
          nextLogs.push(createLogEntry('system', 'Session saving is unavailable because Supabase is not configured.'));
        } else {
          nextLogs.push(createLogEntry('system', `Session save failed: ${saveResult.error.message}.`));
        }
      }

      if (operation.type === 'load') {
        const loadResult = await loadSessionByName(operation.sessionName);

        if (loadResult.ok && loadResult.data) {
          applyLoadedSession(loadResult.data, `OK. I loaded the session "${operation.sessionName}".`);
          return;
        }

        nextLogs.push(
          createLogEntry(
            'system',
            loadResult.skipped
              ? 'Session loading is unavailable because Supabase is not configured.'
              : `I could not find a session named "${operation.sessionName}".`
          )
        );
      }

      if (operation.type === 'delete') {
        const deleteResult = await deleteSessionByName(operation.sessionName);

        if (deleteResult.ok && deleteResult.count > 0) {
          if (workingSessionName === operation.sessionName) {
            workingSessionName = null;
          }

          nextLogs.push(createLogEntry('system', `OK. I removed the session "${operation.sessionName}".`));
        } else if (deleteResult.ok) {
          nextLogs.push(createLogEntry('system', `I could not find a session named "${operation.sessionName}".`));
        } else if (deleteResult.skipped) {
          nextLogs.push(createLogEntry('system', 'Session removal is unavailable because Supabase is not configured.'));
        } else {
          nextLogs.push(createLogEntry('system', `Session removal failed: ${deleteResult.error.message}.`));
        }
      }

      if (operation.type === 'list') {
        const listResult = await listSessions();

        if (listResult.ok) {
          const namedSessions = listResult.data ?? [];
          nextLogs.push(
            createLogEntry(
              'system',
              namedSessions.length
                ? `Saved sessions: ${namedSessions.map((session) => session.session_name).join(', ')}.`
                : 'There are no named saved sessions yet.'
            )
          );
        } else if (listResult.skipped) {
          nextLogs.push(createLogEntry('system', 'Session listing is unavailable because Supabase is not configured.'));
        } else {
          nextLogs.push(createLogEntry('system', `Session listing failed: ${listResult.error.message}.`));
        }
      }

      if (operation.type === 'help') {
        setIsHelpOpen(true);
        nextLogs.push(createLogEntry('system', 'Opened the help dialog.'));
      }
    }

    setObjects(workingObjects);
    setHeldObjectId(workingHeldObjectId);
    setParserMemory(workingMemory);
    setCommandHistory(nextCommandHistory);
    setActiveSessionName(workingSessionName);
    setLogs(nextLogs);

    saveSession({
      sessionId: sessionIdRef.current,
      sessionName: workingSessionName,
      command: cmd,
      commandHistory: nextCommandHistory,
      objects: workingObjects,
      logs: nextLogs,
      parserMemory: workingMemory,
      heldObjectId: workingHeldObjectId,
    }).then((result) => {
      if (result.ok || result.skipped) {
        return;
      }

      setLogs((prev) => [
        ...prev,
        createLogEntry(
          'system',
          `Session save failed: ${result.error.message}. Check your Supabase table and environment configuration.`
        ),
      ]);
    });
  };

  return (
    <div className="App">
      <div className="session-banner">
        <span className="session-banner__label">Editing Session</span>
        <span className="session-banner__name">{activeSessionName ?? 'Current Workspace'}</span>
      </div>
      {isHelpOpen ? (
        <div className="help-modal-backdrop" onClick={() => setIsHelpOpen(false)}>
          <div className="help-modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="help-title">
            <div className="help-modal__header">
              <div>
                <div className="help-modal__eyebrow">Command Help</div>
                <h2 id="help-title" className="help-modal__title">SHRDLU-3JS</h2>
                <div className="help-modal__subtitle">How To Use SHRDLU</div>
              </div>
              <button className="help-modal__close" type="button" onClick={() => setIsHelpOpen(false)}>
                Close
              </button>
            </div>
            <div className="help-modal__content">
              <p>Type commands in the console to manipulate objects, ask questions, and manage sessions.</p>
              <p><strong>Scene commands:</strong> <code>make new scene #</code>, <code>shuffle</code>, <code>add large blue cube</code>, <code>add jumbo red box</code></p>
              <p><strong>Movement commands:</strong> <code>pick up the cube</code>, <code>put the blue sphere next to the red cube</code>, <code>put the cone in the green box</code>, <code>drop</code></p>
              <p><strong>Questions:</strong> <code>which cube is closest to the yellow sphere</code>, <code>is the blue sphere next to the red cube</code></p>
              <p><strong>Session commands:</strong> <code>save demo</code>, <code>load demo</code>, <code>list sessions</code>, <code>remove session demo</code></p>
              <p><strong>Tip:</strong> references can use nested descriptions like <code>the cube which is smaller than the red cube</code> or <code>the sphere in the orange box</code>.</p>
            </div>
          </div>
        </div>
      ) : null}
      <World objects={objects} />
      <Console logs={logs} onCommand={handleCommand} />
    </div>
  );
}

export default App;
