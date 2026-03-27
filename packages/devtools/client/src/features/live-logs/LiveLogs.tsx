import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FitAddon } from '@xterm/addon-fit';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { Pause, Play, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function LiveLogs() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      theme: {
        background: '#09090b', // zinc-950
        foreground: '#fafafa', // zinc-50
        cursor: '#fafafa',
        selectionBackground: '#27272a', // zinc-800
      },
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 12,
      convertEol: true,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = term;

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) {
      wsRef.current?.close();
      return;
    }

    // Determine WS URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in dev mode (vite), we might need to point to backend port
    // But usually we proxy /_stratix/api to backend.
    // Let's assume relative path works via proxy or same origin.
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/_stratix/api/logs`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      xtermRef.current?.writeln('\x1b[32m[System] Connected to log stream\x1b[0m');
    };

    ws.onmessage = (event) => {
      if (xtermRef.current) {
        // Try to pretty print JSON logs if possible, or just print raw
        try {
          const data = JSON.parse(event.data);
          // Simple formatting for Pino JSON logs
          if (data.level && data.msg) {
             const time = new Date(data.time).toLocaleTimeString();
             const levelColor = getLevelColor(data.level);
             const levelName = getLevelName(data.level);
             xtermRef.current.writeln(`\x1b[90m${time}\x1b[0m ${levelColor}${levelName}\x1b[0m: ${data.msg}`);
          } else {
             xtermRef.current.writeln(event.data);
          }
        } catch (e) {
          xtermRef.current.writeln(event.data);
        }
      }
    };

    ws.onclose = () => {
      xtermRef.current?.writeln('\x1b[33m[System] Disconnected from log stream\x1b[0m');
    };

    ws.onerror = (err) => {
      xtermRef.current?.writeln('\x1b[31m[System] WebSocket Error\x1b[0m');
      console.error(err);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [isPlaying]);

  const clearLogs = () => {
    xtermRef.current?.clear();
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="py-3 bg-muted/50 flex flex-row items-center justify-between">
        <CardTitle className="text-sm">Live Logs</CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={togglePlay} title={isPlaying ? "Pause" : "Resume"}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <Button variant="ghost" size="icon" onClick={clearLogs} title="Clear">
            <Trash2 size={16} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0 bg-zinc-950 overflow-hidden relative">
        <div ref={terminalRef} className="absolute inset-0 p-4" />
      </CardContent>
    </Card>
  );
}

function getLevelColor(level: number): string {
  if (level >= 60) return '\x1b[31m'; // Fatal - Red
  if (level >= 50) return '\x1b[31m'; // Error - Red
  if (level >= 40) return '\x1b[33m'; // Warn - Yellow
  if (level >= 30) return '\x1b[32m'; // Info - Green
  if (level >= 20) return '\x1b[36m'; // Debug - Cyan
  return '\x1b[90m'; // Trace - Gray
}

function getLevelName(level: number): string {
  if (level >= 60) return 'FATAL';
  if (level >= 50) return 'ERROR';
  if (level >= 40) return 'WARN ';
  if (level >= 30) return 'INFO ';
  if (level >= 20) return 'DEBUG';
  return 'TRACE';
}
