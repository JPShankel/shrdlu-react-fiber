import React, { useState } from 'react';
import './App.css';
import World from './World.tsx';
import Console from './Console.tsx';

const COLORS = ['red', 'yellow', 'orange', 'green', 'blue'];
const SHAPES = ['cube', 'sphere', 'cone'];
const SIZES = ['small', 'medium', 'large'];

const sizeHeightMap = {
  small: 0.35,
  medium: 0.5,
  large: 0.7,
};

const createObject = ({ id, type, size, color, x, z }) => ({
  id,
  type,
  size,
  color,
  position: [x, sizeHeightMap[size], z],
});

function App() {
  const [objects, setObjects] = useState([
    createObject({ id: 'initial-1', type: 'cube', size: 'large', color: 'red', x: -2.5, z: -1.5 }),
    createObject({ id: 'initial-2', type: 'sphere', size: 'medium', color: 'blue', x: 0, z: 1.5 }),
    createObject({ id: 'initial-3', type: 'cone', size: 'small', color: 'yellow', x: 2.5, z: -0.5 }),
    createObject({ id: 'initial-4', type: 'cube', size: 'medium', color: 'green', x: -0.5, z: -3 }),
    createObject({ id: 'initial-5', type: 'sphere', size: 'large', color: 'orange', x: 3, z: 2.5 }),
  ]);
  const [logs, setLogs] = useState([
    'SHRDLU system online.',
    'World seeded with sample objects.',
    'Supported shapes: cube, sphere, cone.',
    'Supported sizes: small, medium, large.',
    'Supported colors: red, yellow, orange, green, blue.',
  ]);

  const handleCommand = (cmd) => {
    const command = cmd.toLowerCase();
    setLogs(prev => [...prev, `USER: ${cmd}`]);

    if (command.includes('add')) {
      const shape = SHAPES.find((candidate) => command.includes(candidate));
      const size = SIZES.find((candidate) => command.includes(candidate)) ?? 'medium';
      const color = COLORS.find((candidate) => command.includes(candidate)) ?? 'green';

      if (!shape) {
        setLogs(prev => [...prev, 'Error. Please specify a shape: cube, sphere, or cone.']);
        return;
      }

      const newObj = createObject({
        id: Date.now().toString(),
        type: shape,
        size,
        color,
        x: Math.random() * 6 - 3,
        z: Math.random() * 6 - 3,
      });

      setObjects(prev => [...prev, newObj]);
      setLogs(prev => [...prev, `OK. I added a ${newObj.size} ${newObj.color} ${newObj.type}.`]);
    } else {
      setLogs(prev => [...prev, "I don't understand that command yet."]);
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
