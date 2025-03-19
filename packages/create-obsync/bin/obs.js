#!/usr/bin/env node
import inquirer from "inquirer";
import ora from "ora";
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";
import { $ } from "zx";

const argv = yargs(hideBin(process.argv))
  .command("init", "Initialize a new obsync project")
  .command("sync", "Sync data with remote server")
  .demandCommand(1, "You need at least one command before moving on")
  .help().argv;

async function main() {
  const spinner = ora("Initializing...").start();

  try {
    // Example command implementation
    if (argv._[0] === "init") {
      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "Enter project name:",
          validate: (input) => !!input || "Project name is required",
        },
      ]);

      await $`mkdir ${answers.projectName}`;
      spinner.succeed(`Project ${answers.projectName} created successfully!`);
    } else if (argv._[0] === "sync") {
      // Implement sync logic here
      spinner.succeed("Sync completed!");
    }
  } catch (error) {
    spinner.fail(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
