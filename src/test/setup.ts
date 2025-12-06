import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock ELK
vi.mock('elkjs/lib/elk.bundled.js', () => {
  return {
    default: class ELK {
      layout(graph: any) {
        return Promise.resolve({
          ...graph,
          children: graph.children?.map((c: any) => ({ ...c, x: 0, y: 0 })) || []
        });
      }
    }
  };
});
