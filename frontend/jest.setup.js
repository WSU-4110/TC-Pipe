import { TextEncoder, TextDecoder } from 'util';
import '@testing-library/jest-dom';

// react-router needs these, and the jsdom test environment does not provide them
Object.assign(global, { TextEncoder, TextDecoder });
