import readline from 'node:readline/promises';
import { stdin as processStdin, stdout as processStdout } from 'node:process';

export interface PromptChoice {
  label: string;
  value: string;
}

export interface CliPrompter {
  select(
    message: string,
    choices: PromptChoice[],
    options?: { defaultValue?: string }
  ): Promise<string>;
  text(
    message: string,
    options?: { defaultValue?: string; allowEmpty?: boolean }
  ): Promise<string>;
  confirm(
    message: string,
    options?: { defaultValue?: boolean }
  ): Promise<boolean>;
  close?(): Promise<void> | void;
}

interface ConsolePrompterOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

function normalizeAnswer(value: string): string {
  return value.trim();
}

export function createConsolePrompter(
  options: ConsolePrompterOptions = {}
): CliPrompter {
  const output = options.output || processStdout;
  const rl = readline.createInterface({
    input: options.input || processStdin,
    output
  });

  return {
    async select(message, choices, promptOptions = {}) {
      if (choices.length === 0) {
        throw new Error(`No choices available for prompt: ${message}`);
      }

      const defaultValue = promptOptions.defaultValue || choices[0]?.value;

      while (true) {
        output.write(`${message}\n`);
        choices.forEach((choice, index) => {
          const suffix = choice.value === defaultValue ? ' (default)' : '';
          output.write(`  ${index + 1}. ${choice.label}${suffix}\n`);
        });

        const rawAnswer = await rl.question('> ');
        const answer = normalizeAnswer(rawAnswer);

        if (!answer) {
          return defaultValue;
        }

        const numericIndex = Number(answer);
        if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= choices.length) {
          return choices[numericIndex - 1]!.value;
        }

        const matchedChoice = choices.find(
          (choice) => choice.value === answer || choice.label === answer
        );
        if (matchedChoice) {
          return matchedChoice.value;
        }

        output.write('Please choose one of the listed options.\n');
      }
    },

    async text(message, promptOptions = {}) {
      const suffix = promptOptions.defaultValue
        ? ` (${promptOptions.defaultValue})`
        : '';

      while (true) {
        const rawAnswer = await rl.question(`${message}${suffix}: `);
        const answer = normalizeAnswer(rawAnswer);

        if (!answer) {
          if (promptOptions.defaultValue !== undefined) {
            return promptOptions.defaultValue;
          }

          if (promptOptions.allowEmpty === true) {
            return '';
          }

          output.write('Please enter a value.\n');
          continue;
        }

        return answer;
      }
    },

    async confirm(message, promptOptions = {}) {
      const defaultValue = promptOptions.defaultValue ?? true;
      const suffix = defaultValue ? 'Y/n' : 'y/N';

      while (true) {
        const rawAnswer = await rl.question(`${message} (${suffix}): `);
        const answer = normalizeAnswer(rawAnswer).toLowerCase();

        if (!answer) {
          return defaultValue;
        }

        if (['y', 'yes'].includes(answer)) {
          return true;
        }

        if (['n', 'no'].includes(answer)) {
          return false;
        }

        output.write('Please answer yes or no.\n');
      }
    },

    async close() {
      rl.close();
    }
  };
}
