/**
 * Incremental Server-Sent Events parser, per the WHATWG event-stream format.
 * Feed it decoded text in whatever chunks the network delivers; it dispatches
 * one message per blank-line-terminated event. React Native has no
 * EventSource, so the app streams with fetch and parses here.
 */

export interface SseMessage {
  event: string;
  data: string;
  id?: string;
}

export interface SseParser {
  push(chunk: string): void;
  /** The server's last `retry:` value, in milliseconds. */
  retryMs(): number | undefined;
  lastEventId(): string | undefined;
}

export function createSseParser(onMessage: (message: SseMessage) => void): SseParser {
  let buffer = '';
  let eventType = '';
  let dataLines: string[] = [];
  let lastId: string | undefined;
  let retry: number | undefined;

  function dispatch(): void {
    if (dataLines.length > 0) {
      const message: SseMessage = {
        event: eventType === '' ? 'message' : eventType,
        data: dataLines.join('\n'),
      };
      if (lastId !== undefined) message.id = lastId;
      onMessage(message);
    }
    eventType = '';
    dataLines = [];
  }

  function processLine(line: string): void {
    if (line === '') {
      dispatch();
      return;
    }
    if (line.startsWith(':')) return;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    switch (field) {
      case 'event':
        eventType = value;
        break;
      case 'data':
        dataLines.push(value);
        break;
      case 'id':
        if (!value.includes('\0')) lastId = value;
        break;
      case 'retry':
        if (/^\d+$/.test(value)) retry = Number(value);
        break;
      default:
        break;
    }
  }

  return {
    push(chunk: string): void {
      buffer += chunk;
      // A trailing '\r' may be half of a '\r\n' split across chunks; wait for the next one.
      const lines = buffer.split(/\r\n|\r(?!$)|\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) processLine(line);
    },
    retryMs: () => retry,
    lastEventId: () => lastId,
  };
}
