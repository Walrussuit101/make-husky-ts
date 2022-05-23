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

    const projectDirectory = createProjectDirectory(projectName);
    execSync("git init && npm init -y", { cwd: projectDirectory }); // setup git repo / npm project
    execSync("npm set-script prepare 'husky install' && npm run prepare", {
        cwd: projectDirectory
    }); // install husky
    execSync("npm set-script start 'ts-node src/index.ts'", {
        cwd: projectDirectory
    }); // add start command

    installDeps(projectDirectory);
    execSync(
        "npm pkg set lint-staged.**/*='prettier --write --ignore-unknown'",
        { cwd: projectDirectory }
    ); // add lint-staged key
    execSync("npm pkg set prettier.tabWidth=4 --json", {
        cwd: projectDirectory
    }); // add prettier config
    execSync("npm pkg set prettier.endOfLine=lf", { cwd: projectDirectory });
    execSync("npm pkg set prettier.trailingComma=none", {
        cwd: projectDirectory
    });

    execSync("npx husky add .husky/pre-commit 'npx lint-staged'", {
        cwd: projectDirectory
    }); // add husky precommit hook

    mkdirSync(path.join(projectDirectory, "src"));
    writeFileSync(
        path.join(projectDirectory, "src", "index.ts"),
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
