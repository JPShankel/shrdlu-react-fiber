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

  const logParsedCommand = (result) => {
    setLogs((prev) => {
      const nextLogs = [...prev, createLogEntry('system', `TOKENS: ${result.tokens.join(' | ')}`)];

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
    });
  };

  const describeObject = (object) => `${object.size} ${object.color} ${object.type}`;

  const buildObjectFromReference = (reference) => {
    const type = reference.shape;
    const size = reference.size ?? 'medium';
    const color = reference.color ?? 'green';

    if (!type) {
      return null;
    }

    return createObject({
      id: Date.now().toString(),
      type,
      size,
      color,
      x: Math.random() * 6 - 3,
      z: Math.random() * 6 - 3,
    });
  };

  const releaseHeldObject = (targetId = heldObjectId) => {
    if (!targetId) {
      return null;
    }

    let releasedObject = null;

    setObjects((prev) =>
      prev.map((object) => {
        if (object.id !== targetId) {
          return object;
        }

        releasedObject = {
          ...object,
          isHeld: false,
          position: [...object.basePosition],
        };

        return releasedObject;
      })
    );
    setHeldObjectId((current) => (current === targetId ? null : current));

    return releasedObject;
  };

  const pickUpObject = (targetObject) => {
    let releasedDescription = null;

    if (heldObjectId && heldObjectId !== targetObject.id) {
      const releasedObject = releaseHeldObject(heldObjectId);
      if (releasedObject) {
        releasedDescription = describeObject(releasedObject);
      }
    }

    setObjects((prev) =>
      prev.map((object) => {
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
      })
    );
    setHeldObjectId(targetObject.id);

    return releasedDescription;
  };

  const executeAction = (clause) => {
    if (clause.action === 'add') {
      const newObject = buildObjectFromReference(clause.directObject);

      if (!newObject) {
        setLogs((prev) => [...prev, createLogEntry('system', 'Error. Please specify a shape to add: cube, sphere, or cone.')]);
        return true;
      }

      setObjects((prev) => [...prev, newObject]);
      setParserMemory((prev) => ({ ...prev, lastSingular: newObject }));
      setLogs((prev) => [...prev, createLogEntry('system', `OK. I added a ${describeObject(newObject)}.`)]);
      return true;
    }

    if (clause.action === 'remove') {
      if (clause.directResolution.status !== 'resolved') {
        setLogs((prev) => [...prev, createLogEntry('system', `I can't remove that because the object reference is ${clause.directResolution.status}.`)]);
        return true;
      }

      const targetObject = clause.directResolution.matches[0];
      setObjects((prev) => prev.filter((object) => object.id !== targetObject.id));
      setParserMemory((prev) => ({
        ...prev,
        lastSingular: prev.lastSingular?.id === targetObject.id ? null : prev.lastSingular,
      }));

      if (heldObjectId === targetObject.id) {
        setHeldObjectId(null);
      }

      setLogs((prev) => [...prev, createLogEntry('system', `OK. I removed the ${describeObject(targetObject)}.`)]);
      return true;
    }

    if (clause.action === 'pick_up') {
      if (clause.directResolution.status !== 'resolved') {
        setLogs((prev) => [...prev, createLogEntry('system', `I can't pick that up because the object reference is ${clause.directResolution.status}.`)]);
        return true;
      }

      const targetObject = clause.directResolution.matches[0];

      if (heldObjectId === targetObject.id) {
        setLogs((prev) => [...prev, createLogEntry('system', `I am already holding the ${describeObject(targetObject)}.`)]);
        return true;
      }

      const releasedDescription = pickUpObject(targetObject);
      setLogs((prev) => {
        const nextLogs = [...prev];

        if (releasedDescription) {
          nextLogs.push(createLogEntry('system', `OK. I put down the ${releasedDescription}.`));
        }

        nextLogs.push(createLogEntry('system', `OK. I picked up the ${describeObject(targetObject)}.`));
        return nextLogs;
      });
      return true;
    }

    if (clause.action === 'put_down') {
      if (!heldObjectId) {
        setLogs((prev) => [...prev, createLogEntry('system', 'I am not holding anything.')]);
        return true;
      }

      const releasedObject = releaseHeldObject();
      if (releasedObject) {
        setLogs((prev) => [...prev, createLogEntry('system', `OK. I put down the ${describeObject(releasedObject)}.`)]);
      }
      return true;
    }

    return false;
  };

  const handleCommand = (cmd) => {
    setLogs(prev => [...prev, createLogEntry('user', cmd)]);

    const parsed = parseCommand(cmd, objects, parserMemory);
    setParserMemory(parsed.memory);
    logParsedCommand(parsed);

    const executedClause = parsed.clauses.some((clause) => executeAction(clause));

    if (executedClause) {
      return;
    }

    if (parsed.clauses.some((clause) => clause.action !== 'unknown')) {
      setLogs(prev => [...prev, createLogEntry('system', 'OK. I parsed the command into actions, object references, and location references.')]);
    } else {
      setLogs(prev => [...prev, createLogEntry('system', "I don't understand that command yet.")]);
    }
  };

  return (
    <div className="App">
      <World objects={objects} />
      <Console logs={logs} onCommand={handleCommand} />
    </div>
  );
}

export default App;
