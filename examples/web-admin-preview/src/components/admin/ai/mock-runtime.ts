import type {
  ChatModelAdapter,
  ThreadMessage,
  ThreadSuggestion
} from '@assistant-ui/react';

export const mockAssistantSuggestions: ThreadSuggestion[] = [
  { prompt: 'Summarize the current admin shell gaps.' },
  { prompt: 'List the next steps for the Users module rollout.' },
  { prompt: 'Suggest filters for an operations reporting page.' },
  { prompt: 'Draft a release checklist for this dashboard scaffold.' }
];

function getMessageText(message: ThreadMessage | undefined): string {
  if (!message) {
    return '';
  }

  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
    .trim();
}

export function extractLatestUserPrompt(
  messages: readonly ThreadMessage[]
): string {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user');

  return getMessageText(latestUserMessage);
}

export function createMockAssistantReply(prompt: string): string {
  const normalizedPrompt = prompt.trim();
  const subject =
    normalizedPrompt.length > 0
      ? normalizedPrompt
      : 'the current admin workspace';
  const loweredPrompt = normalizedPrompt.toLowerCase();

  const focusArea = loweredPrompt.includes('report')
    ? 'reporting and monitoring'
    : loweredPrompt.includes('user') || loweredPrompt.includes('team')
      ? 'operators, roles and access control'
      : loweredPrompt.includes('release') || loweredPrompt.includes('rollout')
        ? 'delivery readiness and rollout sequencing'
        : 'the shell architecture and reusable admin patterns';

  return [
    `Here is a mock copilot take on **${subject}**.`,
    '',
    `Current focus: ${focusArea}.`,
    '',
    '1. Start from the left navigation and confirm the active module, breadcrumb trail and permissions context.',
    '2. Use the command palette to jump to adjacent admin surfaces without leaving the current workflow.',
    '3. Keep the right-side AI workbench open while editing so the conversation stays visible beside the page you are operating on.',
    '',
    'This assistant is currently powered by `assistant-ui` with a local mock runtime, so the shell, threading and markdown rendering are production-shaped even before a real model adapter is wired in.'
  ].join('\n');
}

export const mockAssistantChatModel: ChatModelAdapter = {
  run: async ({ messages }) => {
    const prompt = extractLatestUserPrompt(messages);
    const responseText = createMockAssistantReply(prompt);

    await new Promise((resolve) => {
      globalThis.setTimeout(resolve, 260);
    });

    return {
      content: [
        {
          type: 'text',
          text: responseText
        }
      ],
      status: {
        type: 'complete',
        reason: 'stop'
      }
    };
  }
};
