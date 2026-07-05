import fs from 'node:fs';
import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import {
  decryptConfig,
  encryptConfig,
  generateSecureKey,
  loadConfigFromFile,
  saveConfigToFile,
  validateConfig,
  type ConfigValidationOptions
} from '../../utils/config-crypto.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';

function getStringArg(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function configHelp(subcommand?: string): string {
  switch (subcommand) {
    case 'encrypt':
      return `Usage: stratix config encrypt <file> [options]

Options:
  --key <key>       Encryption key
  --output <file>   Write encrypted config to a file
  --format <env|json>
                   Output format when --output is used, defaults to env
  --verbose         Print verbose crypto diagnostics
  --help            Show this help message`;
    case 'decrypt':
      return `Usage: stratix config decrypt <encrypted-string> [options]

Options:
  --key <key>       Encryption key
  --output <file>   Write decrypted config to a file
  --format <json|env>
                   Output format when --output is used, defaults to json
  --verbose         Print verbose crypto diagnostics
  --help            Show this help message`;
    case 'validate':
      return `Usage: stratix config validate <file> [options]

Options:
  --required <keys> Comma-separated required top-level keys
  --strict          Reject unknown top-level keys
  --help            Show this help message`;
    case 'generate-key':
      return `Usage: stratix config generate-key [options]

Options:
  --length <bytes>  Key length in bytes, defaults to 32
  --format <format> Key format: hex or base64, defaults to hex
  --help            Show this help message`;
    default:
      return `Usage: stratix config <encrypt|decrypt|validate|generate-key> [options]

Commands:
  config encrypt       Encrypt a JSON config file
  config decrypt       Decrypt an encrypted config string
  config validate      Validate a JSON config file
  config generate-key  Generate a random key

Options:
  --help               Show this help message`;
  }
}

export async function configCommand(
  argv: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const subcommand = argv._[1];
  if (argv.help || subcommand === 'help') {
    output.log(configHelp(subcommand === 'help' ? argv._[2] : subcommand));
    return;
  }

  switch (subcommand) {
    case 'encrypt':
      return encryptCommand(argv, output);
    case 'decrypt':
      return decryptCommand(argv, output);
    case 'validate':
      return validateCommand(argv, output);
    case 'generate-key':
      return generateKeyCommand(argv, output);
    default:
      throw new CliError(configHelp());
  }
}

async function encryptCommand(
  args: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const filePath = args._[2];
  if (!filePath) {
    throw new CliError('Usage: stratix config encrypt <file>');
  }

  const key = getStringArg(args.key);
  const outputPath = getStringArg(args.output);
  const format = getStringArg(args.format) || 'env';
  const config = loadConfigFromFile(filePath);
  const encrypted = encryptConfig(config, {
    ...(key ? { key } : {}),
    verbose: Boolean(args.verbose)
  });

  if (outputPath) {
    if (format === 'env') {
      const envContent = `STRATIX_SENSITIVE_CONFIG="${encrypted}"\n`;
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, envContent, 'utf8');
    } else {
      saveConfigToFile(
        { STRATIX_SENSITIVE_CONFIG: encrypted },
        outputPath,
        format as 'json' | 'env'
      );
    }
    output.success(`Encrypted config saved to ${outputPath}`);
    return;
  }

  output.log(encrypted);
}

async function decryptCommand(
  args: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const encryptedString = args._[2];
  if (!encryptedString) {
    throw new CliError('Usage: stratix config decrypt <encrypted-string>');
  }

  const key = getStringArg(args.key);
  const outputPath = getStringArg(args.output);
  const format = getStringArg(args.format) || 'json';
  const config = decryptConfig(encryptedString, {
    ...(key ? { key } : {}),
    verbose: Boolean(args.verbose)
  });

  if (outputPath) {
    saveConfigToFile(config, outputPath, format as 'json' | 'env');
    output.success(`Decrypted config saved to ${outputPath}`);
    return;
  }

  output.log(JSON.stringify(config, null, 2));
}

async function validateCommand(
  args: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const filePath = args._[2];
  if (!filePath) {
    throw new CliError('Usage: stratix config validate <file>');
  }

  const required = getStringArg(args.required);
  const config = loadConfigFromFile(filePath);
  const options: ConfigValidationOptions = {
    strict: Boolean(args.strict),
    ...(required && {
      requiredKeys: required
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    })
  };
  const result = validateConfig(config, options);

  if (!result.isValid) {
    throw new CliError(
      `Config validation failed: ${(result.errors || []).join(', ')}`
    );
  }

  output.success('Config validation passed.');
}

async function generateKeyCommand(
  args: ParsedArgs,
  output: CliOutput
): Promise<void> {
  const lengthValue = getStringArg(args.length);
  const formatValue = getStringArg(args.format);
  const length = lengthValue ? Number(lengthValue) : 32;
  const format = (formatValue || 'hex') as 'hex' | 'base64';
  output.log(String(generateSecureKey(length, format)));
}
