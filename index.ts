#!/usr/bin/env node
import { program } from "commander";
import util from "util";
import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import ora from "ora";

import packageFile from "./package.json";

const spinner = ora();
const execPromise = util.promisify(exec);

// Create and return the project directory path
const createProjectDirectory = async (projectName: string): Promise<string> => {
    spinner.start("Creating project directory, git repo, and npm project");

    const projectDirectory = path.join(process.cwd(), projectName);

    // if project won't be in cwd, check it doesn't exist then make it
    if (projectName !== ".") {
        try {
            await fs.access(projectDirectory);
        } catch (e) {
            // directory doesn't exist, create the directory
            await fs.mkdir(projectDirectory, { recursive: true });
            await execPromise("git init && npm init -y", {
                cwd: projectDirectory
            });
            spinner.succeed();

            return projectDirectory;
        }

        // if we get here that means we access the project directory / it exists
        spinner.fail();
        throw new Error(
            `Project directory already exists: ${projectDirectory}`
        );
    }

    return projectDirectory;
};

// Install dependencies in the project directory
const installDeps = async (projectDirectory: string): Promise<void> => {
    const DEV_DEPS = [
        "typescript",
        "ts-node",
        "@types/node",
        "husky",
        "prettier",
        "lint-staged"
    ];

    let installCmd = "npm install --save-dev";

    DEV_DEPS.forEach((DEP) => {
        installCmd += ` ${DEP}`;
    });

    spinner.start("Installing dependencies");

    try {
        await execPromise(installCmd, { cwd: projectDirectory });
        spinner.succeed();
    } catch (e) {
        spinner.fail();
        throw e;
    }
};

// set package file keys / scripts
const updateNPM = async (projectDirectory: string) => {
    const execOpt = { cwd: projectDirectory };

    spinner.start("Updating npm package file");

    // must wait for this command as husky needs to be installed
    await execPromise(
        'npm set-script prepare "husky install" && npm run prepare',
        execOpt
    );

    try {
        await Promise.all([
            execPromise('npm set-script start "ts-node src/index.ts"', execOpt),
            execPromise(
                'npm pkg set lint-staged.**/*="prettier --write --ignore-unknown"',
                execOpt
            ),
            execPromise("npm pkg set prettier.tabWidth=4 --json", execOpt),
            execPromise("npm pkg set prettier.endOfLine=lf", execOpt),
            execPromise("npm pkg set prettier.trailingComma=none", execOpt),
            execPromise(
                'npx husky add .husky/pre-commit "npx lint-staged"',
                execOpt
            )
        ]);

        spinner.succeed();
    } catch (e) {
        spinner.fail();
        throw e;
    }
};

// create gitignore, readme, src/index, tsconfig
const addProjectFiles = async (
    projectDirectory: string,
    projectName: string
): Promise<void> => {
    spinner.start("Adding project files");

    const gitignorePath = path.join(projectDirectory, ".gitignore");
    const readMePath = path.join(projectDirectory, "README.md");
    const projectSrcDir = path.join(projectDirectory, "src");
    const projectIndexPath = path.join(projectSrcDir, "index.ts");
    const tsConfigPath = path.join(projectDirectory, "tsconfig.json");
    const tsConfig = {
        compilerOptions: {
            lib: ["ESNext"],
            strict: true,
            esModuleInterop: true
        }
    };

    // update projectName for further use, if its . get project path basename, otherwise use the given name
    const updatedProjectName =
        projectName === "." ? path.basename(projectDirectory) : projectName;

    try {
        await fs.mkdir(projectSrcDir);
        await Promise.all([
            fs.writeFile(gitignorePath, "node_modules\npackage-lock.json"),
            fs.writeFile(readMePath, `# ${projectName}\n`),
            fs.writeFile(tsConfigPath, JSON.stringify(tsConfig, undefined, 2)),
            fs.writeFile(
                projectIndexPath,
                `console.log("hello world! project name: ${updatedProjectName}");`
            )
        ]);

        spinner.succeed();
    } catch (e) {
        spinner.fail();
        throw e;
    }
};

const mainProc = async (projectName: string) => {
    const projectDirectory = await createProjectDirectory(projectName);
    await installDeps(projectDirectory);
    await updateNPM(projectDirectory);
    await addProjectFiles(projectDirectory, projectName);
    spinner.succeed(`Project created at: ${projectDirectory}`);
};

// setup commander and accept args
program
    .name(packageFile.name)
    .version(packageFile.version)
    .description(packageFile.description)
    .addHelpText(
        "after",
        `
Valid arguments:
    project_name:
      - can only contain a-z, A-Z, 0-9, -, /, and _ characters
      - to make in current directory use .`
    )
    .usage("<project_name>")
    .argument("<project_name>", "The name for your project")
    .action((projectName) => {
        // validate projectName, a-zA-Z0-9_/- or a period
        const newDirRegex = new RegExp(/^[A-Za-z0-9_/-]*$/);

        // if the name given doesn't pass new directory test and isn't '.' throw error
        if (!newDirRegex.test(projectName) && projectName !== ".") {
            throw new Error("Invalid project name given");
        }

        try {
            mainProc(projectName);
        } catch (e) {
            console.error(e);
        }
    });

// accept input
program.parse();
