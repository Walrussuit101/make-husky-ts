#!/usr/bin/env node
import { program } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { execSync, exec } from "child_process";
import ora from "ora";

import packageFile from "./package.json";

const spinner = ora();

// Create and return the project directory path
const createProjectDirectory = (projectName: string): string => {
    const projectDirectory = path.join(process.cwd(), projectName);

    // if project will be in cwd, just return the projectDirectory path
    if (projectName === ".") {
        return projectDirectory;
    }

    // check that potential directory doesn't exist
    if (existsSync(projectDirectory)) {
        throw new Error(
            `Project directory already exists: ${projectDirectory}`
        );
    }

    // otherwise create the directory
    mkdirSync(projectDirectory, { recursive: true });

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

    return new Promise((resolve, reject) => {
        exec(installCmd, { cwd: projectDirectory }).on("close", (code) => {
            if (code === 0) {
                spinner.succeed();
                resolve();
                return;
            }

            spinner.fail();
            reject();
        });
    });
};

// set package file keys / scripts
const updateNPM = async (projectDirectory: string) => {
    const execOpt = { cwd: projectDirectory };

    spinner.start("Updating npm package file");

    execSync(
        'npm set-script prepare "husky install" && npm run prepare',
        execOpt
    );
    try {
        await Promise.all([
            exec('npm set-script start "ts-node src/index.ts"', execOpt),
            exec(
                'npm pkg set lint-staged.**/*="prettier --write --ignore-unknown"',
                execOpt
            ),
            exec("npm pkg set prettier.tabWidth=4 --json", execOpt),
            exec("npm pkg set prettier.endOfLine=lf", execOpt),
            exec("npm pkg set prettier.trailingComma=none", execOpt),
            exec('npx husky add .husky/pre-commit "npx lint-staged"', execOpt)
        ]);

        spinner.succeed();
    } catch (e) {
        spinner.fail();
    }
};

// create git related files like gitignore, README
const addGitFiles = (projectDirectory: string, projectName: string) => {
    const gitignorePath = path.join(projectDirectory, ".gitignore");
    const readMePath = path.join(projectDirectory, "README.md");

    writeFileSync(gitignorePath, "node_modules\npackage-lock.json");
    writeFileSync(readMePath, `# ${projectName}`);
};

const mainProc = async (projectName: string) => {
    // create dir, git repo, npm proj, install deps, and update package file keys / scripts
    const projectDirectory = createProjectDirectory(projectName);
    execSync("git init && npm init -y", { cwd: projectDirectory });
    await installDeps(projectDirectory);
    await updateNPM(projectDirectory);

    // update projectName for further use, if its . get project path basename, otherwise use the given name
    const updatedProjectName =
        projectName === "." ? path.basename(projectDirectory) : projectName;

    // add index.ts file
    const projectSrcDir = path.join(projectDirectory, "src");
    const projectIndexPath = path.join(projectSrcDir, "index.ts");
    mkdirSync(projectSrcDir);
    writeFileSync(
        projectIndexPath,
        `console.log("hello world! project name: ${updatedProjectName}");`
    );

    // add tsconfig file
    const tsConfigPath = path.join(projectDirectory, "tsconfig.json");
    const tsConfig = {
        compilerOptions: {
            lib: ["ESNext"],
            strict: true,
            esModuleInterop: true
        }
    };
    writeFileSync(tsConfigPath, JSON.stringify(tsConfig, undefined, 2));

    // add gitignore / README
    addGitFiles(projectDirectory, updatedProjectName);
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
