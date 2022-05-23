import { program } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import path from "path";
import { execSync } from "child_process";

import packageFile from "./package.json";

// Create and return the project directory path
const createProjectDirectory = (projectName: string): string => {
    const projectDirectory = path.join(process.cwd(), projectName);

    // if projectName is not '.' check that potential directory doesn't exist
    if (projectName !== "." && existsSync(projectDirectory)) {
        throw new Error(
            `Project directory already exists: ${projectDirectory}`
        );
    }

    // otherwise create the directory
    mkdirSync(projectDirectory);

    return projectDirectory;
};

// Install dependencies in the project directory
const installDeps = (projectDirectory: string): void => {
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

    execSync(installCmd, { cwd: projectDirectory });
};

const mainProc = (projectName: string) => {
    // - make tsconfig file
    // - make gitignore
    // - make README

    const projectDirectory = createProjectDirectory(projectName);
    const execOpt = { cwd: projectDirectory };
    execSync("git init && npm init -y", execOpt);
    execSync(
        "npm set-script prepare 'husky install' && npm run prepare",
        execOpt
    );
    execSync("npm set-script start 'ts-node src/index.ts'", execOpt);

    installDeps(projectDirectory);
    execSync(
        "npm pkg set lint-staged.**/*='prettier --write --ignore-unknown'",
        execOpt
    );
    execSync("npm pkg set prettier.tabWidth=4 --json", execOpt);
    execSync("npm pkg set prettier.endOfLine=lf", execOpt);
    execSync("npm pkg set prettier.trailingComma=none", execOpt);

    execSync("npx husky add .husky/pre-commit 'npx lint-staged'", execOpt);

    const projectSrcDir = path.join(projectDirectory, "src");
    const projectIndexPath = path.join(projectSrcDir, "index.ts");
    mkdirSync(projectSrcDir);
    writeFileSync(
        projectIndexPath,
        `console.log("hello world! project name: ${projectName}")`
    );

    console.log(projectName);
};

// setup commander and accept args
program
    .name(packageFile.name)
    .version(packageFile.version)
    .description(packageFile.description)
    .usage("<project_name>")
    .argument("<project_name>", "The name for your project")
    .action((projectName) => {
        // TODO: validate projectName, a-zA-Z-_ etc. or a period

        try {
            mainProc(projectName);
        } catch (e) {
            console.error(e);
        }
    });

// accept input
program.parse();
