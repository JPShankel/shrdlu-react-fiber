import React, { useState } from 'react';
import './App.css';
import World from './World.tsx';
import Console from './Console.tsx';

function App() {
  const [objects, setObjects] = useState([
    { id: 'initial-1', type: 'box', color: 'red', position: [0, 0.5, 0] }
  ]);
  const [logs, setLogs] = useState(['SHRDLU system online.', 'Awaiting instructions.']);

  const handleCommand = (cmd) => {
    const command = cmd.toLowerCase();
    setLogs(prev => [...prev, `USER: ${cmd}`]);

    // Basic trigger for Step 4 (Brain) logic
    if (command.includes('add') && command.includes('box')) {
      const newObj = {
        id: Date.now().toString(),
        type: 'box',
        color: command.includes('blue') ? 'blue' : 'green',
        position: [Math.random() * 4 - 2, 0.5, Math.random() * 4 - 2]
      };
      setObjects(prev => [...prev, newObj]);
      setLogs(prev => [...prev, `OK. I added a ${newObj.color} box.`]);
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
