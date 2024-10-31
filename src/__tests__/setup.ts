/// <reference types="jest" />

export {}; // Make this a module

// Mock window.setInterval
(global as any).window = {
  setInterval: jest.fn(),
};

// Mock document methods
(global as any).document = {
  createDocumentFragment: jest.fn(),
  createElement: jest.fn(),
}; 
