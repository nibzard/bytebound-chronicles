import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebSocketClient } from '../../../src/client/WebSocketClient';
import WebSocket from 'ws';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    default: vi.fn(() => ({
      on: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
      readyState: WebSocket.OPEN,
    })),
    OPEN: 1,
    CONNECTING: 0,
    CLOSING: 2,
    CLOSED: 3,
  };
});

describe('WebSocketClient', () => {
  let mockWebSocket: any;
  let onUpdate: ReturnType<typeof vi.fn>;
  let onConnectionChange: ReturnType<typeof vi.fn>;
  let client: WebSocketClient;

  beforeEach(() => {
    mockWebSocket = {
      on: vi.fn(),
      close: vi.fn(),
      send: vi.fn(),
      readyState: WebSocket.OPEN,
    };
    
    (WebSocket as any).mockImplementation(() => mockWebSocket);
    
    onUpdate = vi.fn();
    onConnectionChange = vi.fn();
    
    client = new WebSocketClient(
      'ws://localhost:3000/ws',
      onUpdate,
      onConnectionChange,
      {
        reconnectInterval: 100,
        maxReconnectAttempts: 2,
        heartbeatInterval: 1000,
      }
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    client.disconnect();
  });

  it('should create WebSocket connection on connect', () => {
    client.connect();
    
    expect(WebSocket).toHaveBeenCalledWith('ws://localhost:3000/ws');
    expect(mockWebSocket.on).toHaveBeenCalledWith('open', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(mockWebSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
  });

  it('should handle successful connection', () => {
    client.connect();
    
    // Simulate 'open' event
    const openHandler = mockWebSocket.on.mock.calls.find((call: any) => call[0] === 'open')[1];
    openHandler();
    
    expect(onConnectionChange).toHaveBeenCalledWith(true);
    expect(client.getConnectionStatus()).toBe(true);
  });

  it('should handle connection close', () => {
    client.connect();
    
    // Simulate 'close' event
    const closeHandler = mockWebSocket.on.mock.calls.find((call: any) => call[0] === 'close')[1];
    closeHandler();
    
    expect(onConnectionChange).toHaveBeenCalledWith(false);
    expect(client.getConnectionStatus()).toBe(false);
  });

  it('should handle session update messages', () => {
    client.connect();
    
    const messageHandler = mockWebSocket.on.mock.calls.find((call: any) => call[0] === 'message')[1];
    const mockUpdate = { id: 'test', currentBeat: 'beat1' };
    const message = {
      toString: () => JSON.stringify({
        type: 'session_update',
        data: mockUpdate,
      }),
    };
    
    messageHandler(message);
    
    expect(onUpdate).toHaveBeenCalledWith(mockUpdate);
  });

  it('should ignore pong messages', () => {
    client.connect();
    
    const messageHandler = mockWebSocket.on.mock.calls.find((call: any) => call[0] === 'message')[1];
    const message = {
      toString: () => JSON.stringify({ type: 'pong' }),
    };
    
    messageHandler(message);
    
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('should send messages when connected', () => {
    mockWebSocket.readyState = WebSocket.OPEN;
    client.connect();
    
    const testMessage = { type: 'test', data: 'hello' };
    client.send(testMessage);
    
    expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(testMessage));
  });

  it('should not send messages when disconnected', () => {
    // Don't connect, just try to send
    const testMessage = { type: 'test', data: 'hello' };
    client.send(testMessage);
    
    expect(mockWebSocket.send).not.toHaveBeenCalled();
  });

  it('should disconnect properly', () => {
    client.connect();
    client.disconnect();
    
    expect(mockWebSocket.close).toHaveBeenCalled();
    expect(onConnectionChange).toHaveBeenCalledWith(false);
    expect(client.getConnectionStatus()).toBe(false);
  });
});