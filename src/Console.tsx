import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface ConsoleProps {
  onCommand: (command: string) => void;
  logs: string[];
}

const Console: React.FC<ConsoleProps> = ({ onCommand, logs }) => {
  const [input, setInput] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      height: '180px',
      background: 'rgba(20, 20, 20, 0.9)',
      color: '#00ff41',
      fontFamily: '"Courier New", Courier, monospace',
      padding: '15px',
      boxSizing: 'border-box',
      borderTop: '2px solid #333',
      zIndex: 100
    }}>
      <div style={{ height: '120px', overflowY: 'auto', marginBottom: '10px' }}>
        {logs.map((log, i) => <div key={i}>{`> ${log}`}</div>)}
        <div ref={logEndRef} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #444', paddingTop: '10px' }}>
        <span style={{ marginRight: '10px' }}>USER:</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#00ff41', fontSize: '16px', fontFamily: 'inherit'
          }}
          placeholder="Type a command (e.g., 'add red box')..."
        />
      </div>
    </div>
  );
};

export default Console;