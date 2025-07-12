require('jest-canvas-mock');
require('@testing-library/jest-dom');

// Mock Headers class
global.Headers = class Headers {
  constructor(init = {}) {
    this._headers = new Map();
    if (init) {
      if (typeof init[Symbol.iterator] === 'function') {
        for (const [key, value] of init) {
          this.set(key, value);
        }
      } else {
        for (const [key, value] of Object.entries(init)) {
          this.set(key, value);
        }
      }
    }
  }
  
  append(name, value) {
    const existing = this._headers.get(name.toLowerCase());
    if (existing) {
      this._headers.set(name.toLowerCase(), `${existing}, ${value}`);
    } else {
      this._headers.set(name.toLowerCase(), value);
    }
  }
  
  delete(name) {
    this._headers.delete(name.toLowerCase());
  }
  
  get(name) {
    return this._headers.get(name.toLowerCase()) || null;
  }
  
  has(name) {
    return this._headers.has(name.toLowerCase());
  }
  
  set(name, value) {
    this._headers.set(name.toLowerCase(), String(value));
  }
  
  *entries() {
    for (const [key, value] of this._headers) {
      yield [key, value];
    }
  }
  
  *keys() {
    for (const key of this._headers.keys()) {
      yield key;
    }
  }
  
  *values() {
    for (const value of this._headers.values()) {
      yield value;
    }
  }
  
  [Symbol.iterator]() {
    return this.entries();
  }
  
  forEach(callback, thisArg) {
    for (const [key, value] of this._headers) {
      callback.call(thisArg, value, key, this);
    }
  }
};

// Mock Next.js globals
global.Request = class Request {
  constructor(url, options = {}) {
    Object.defineProperty(this, 'url', { value: url, writable: false });
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this.body = options.body;
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
};

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Headers(options.headers || {});
  }
  
  json() {
    return Promise.resolve(JSON.parse(this.body));
  }
  
  static json(data, options = {}) {
    return new Response(JSON.stringify(data), {
      status: options.status || 200,
      statusText: options.statusText || 'OK',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });
  }
};

// Mock fetch
global.fetch = jest.fn();

// Mock File API
global.File = class File {
  constructor(chunks, filename, options = {}) {
    this.name = filename;
    this.type = options.type || '';
    this.size = chunks.reduce((size, chunk) => size + chunk.byteLength || chunk.length, 0);
    this._chunks = chunks;
  }
  
  arrayBuffer() {
    const buffer = new ArrayBuffer(this.size);
    const view = new Uint8Array(buffer);
    let offset = 0;
    
    for (const chunk of this._chunks) {
      if (chunk instanceof ArrayBuffer) {
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      } else {
        view.set(chunk, offset);
        offset += chunk.length;
      }
    }
    
    return Promise.resolve(buffer);
  }
};

// Mock environment variables for testing
process.env.JWT_SECRET = 'your-super-secret-jwt-key';
process.env.FROM_EMAIL = 'from@example.com';
process.env.NODE_ENV = 'test';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock window.alert
global.alert = jest.fn();

// Mock lamejs module for audio compression tests
jest.mock('@breezystack/lamejs', () => {
  const mockEncoder = {
    encode: jest.fn().mockReturnValue(new Int8Array(1024)),
    encodeBuffer: jest.fn().mockReturnValue(new Int8Array(1024)),
    flush: jest.fn().mockReturnValue(new Int8Array(512)),
  };

  return {
    __esModule: true,
    default: {
      Mp3Encoder: jest.fn().mockImplementation(() => mockEncoder),
    },
    Mp3Encoder: jest.fn().mockImplementation(() => mockEncoder),
  };
});

if (typeof window !== 'undefined') {
  window.AudioContext = jest.fn().mockImplementation(() => ({
    decodeAudioData: jest.fn(),
    createBuffer: jest.fn(),
    resume: jest.fn().mockResolvedValue(),
    close: jest.fn().mockResolvedValue(),
  }));
}

// Mock Next.js specific request/response classes
jest.mock('next/server', () => {
  const MockNextRequest = class NextRequest extends global.Request {
    constructor(url, options = {}) {
      super(url, options);
      this.cookies = {
        get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
        set: jest.fn(),
        delete: jest.fn(),
        has: jest.fn().mockReturnValue(true),
        clear: jest.fn()
      };
      this.nextUrl = new URL(url);
      this.geo = {};
      this.ip = '127.0.0.1';
    }
  };

  const MockNextResponse = class NextResponse extends global.Response {
    constructor(body, options = {}) {
      super(body, options);
      this.cookies = {
        get: jest.fn().mockReturnValue({ value: 'mock-cookie-value' }),
        set: jest.fn(),
        delete: jest.fn(),
        has: jest.fn().mockReturnValue(true),
        clear: jest.fn()
      };
    }

    static json(data, options = {}) {
      const response = new MockNextResponse(JSON.stringify(data), {
        status: options.status || 200,
        statusText: options.statusText || 'OK',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      return response;
    }

    static redirect(url, statusOrInit = 302) {
      const status = typeof statusOrInit === 'number' ? statusOrInit : statusOrInit.status || 302;
      return new MockNextResponse('', {
        status,
        headers: {
          Location: url
        }
      });
    }

    static rewrite(destination) {
      return new MockNextResponse('', {
        headers: {
          'x-middleware-rewrite': destination
        }
      });
    }

    static next() {
      return new MockNextResponse('');
    }
  };

  return {
    NextRequest: MockNextRequest,
    NextResponse: MockNextResponse,
    userAgent: jest.fn().mockReturnValue({ browser: { name: 'chrome' } })
  };
});