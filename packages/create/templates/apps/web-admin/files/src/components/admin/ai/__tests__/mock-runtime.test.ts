import { describe, expect, it } from 'vitest';
import type { ThreadMessage } from '@assistant-ui/react';

import {
  createMockAssistantReply,
  extractLatestUserPrompt
} from '@/components/admin/ai/mock-runtime';

function createUserMessage(text: string): ThreadMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    createdAt: new Date(),
    content: [
      {
        type: 'text',
        text
      }
    ],
    attachments: [],
    metadata: {
      custom: {}
    }
  };
}

describe('mock assistant runtime helpers', () => {
  it('extracts the latest user text prompt', () => {
    const prompt = extractLatestUserPrompt([
      createUserMessage('first prompt'),
      createUserMessage('latest prompt')
    ]);

    expect(prompt).toBe('latest prompt');
  });

  it('builds a contextual mock reply', () => {
    const reply = createMockAssistantReply(
      'Help me review the reports workspace'
    );

    expect(reply).toContain('reports workspace');
    expect(reply).toContain('reporting and monitoring');
    expect(reply).toContain('assistant-ui');
  });
});
