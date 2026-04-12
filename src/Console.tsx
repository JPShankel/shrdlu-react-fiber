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
  const [height, setHeight] = useState(220);
  const logEndRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizeStateRef.current) {
        return;
      }

      const deltaY = resizeStateRef.current.startY - event.clientY;
      const maxHeight = Math.max(180, Math.floor(window.innerHeight * 0.8));
      const nextHeight = Math.min(maxHeight, Math.max(140, resizeStateRef.current.startHeight + deltaY));
      setHeight(nextHeight);
    };

    const stopResizing = () => {
      resizeStateRef.current = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResizing);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResizing);
    };
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      onCommand(input);
      setInput('');
    }
  };

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: height,
    };
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      width: '100%',
      height: `${height}px`,
      background: 'rgba(20, 20, 20, 0.9)',
      color: '#00ff41',
      fontFamily: '"Courier New", Courier, monospace',
      padding: '12px 15px 15px',
      boxSizing: 'border-box',
      borderTop: '2px solid #333',
      zIndex: 100,
      textAlign: 'left',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <div
        onPointerDown={handleResizeStart}
        style={{
          height: '10px',
          margin: '-6px 0 8px',
          cursor: 'ns-resize',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'none',
        }}
      >
        <div style={{ width: '56px', height: '3px', borderRadius: '999px', background: '#4a4a4a' }} />
      </div>
      <div style={{ flex: 1, overflowY: 'auto', marginBottom: '10px', minHeight: 0 }}>
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
