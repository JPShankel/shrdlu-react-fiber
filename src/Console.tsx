import React, { useState, KeyboardEvent, useRef, useEffect } from 'react';

interface LogEntry {
  type: 'user' | 'system';
  text: string;
}

interface ConsoleProps {
  onCommand: (command: string) => void;
  logs: LogEntry[];
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
      zIndex: 100,
      textAlign: 'left'
    }}>
      <div style={{ height: '120px', overflowY: 'auto', marginBottom: '10px' }}>
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              color: log.type === 'user' ? '#ffd84d' : '#00ff41',
              whiteSpace: 'pre-wrap',
              marginBottom: '4px',
            }}
          >
            {log.type === 'user' ? `> USER: ${log.text}` : `> SYS: ${log.text}`}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #444', paddingTop: '10px' }}>
        <span style={{ marginRight: '10px', color: '#ffd84d' }}>USER:</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#ffd84d', fontSize: '16px', fontFamily: 'inherit', textAlign: 'left'
          }}
          placeholder="Type a command (e.g., 'add large blue cone')..."
        />
      </div>
    </div>
  );
};

export default Console;
