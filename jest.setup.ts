import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill TextEncoder and TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Polyfill standard Web Streams
const { ReadableStream, WritableStream, TransformStream } = require('node:stream/web');
global.ReadableStream = ReadableStream;
global.WritableStream = WritableStream;
global.TransformStream = TransformStream;

// Polyfill MessagePort and MessageChannel before undici loads
const { MessageChannel, MessagePort } = require('node:worker_threads');
global.MessageChannel = MessageChannel;
global.MessagePort = MessagePort;

// Polyfill standard Web APIs with undici
const { Request, Response, Headers, fetch } = require('undici');
global.Request = Request;
global.Response = Response;
global.Headers = Headers;
global.fetch = fetch;
