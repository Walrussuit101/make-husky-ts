import { program } from "commander";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import { execSync } from "child_process";

import packageFile from "./package.json";

/**
 * Create and return the project directory path
 *
 * @param projectName The project name argument from user
 * @returns The project directory
 */
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

const mainProc = (projectName: string) => {
    // - install deps
    // - add package file keys (prettier / lint-staged), add prepare script ('husky install'), add start script ('ts-node src/index.ts')
    // - add husky precommit that calls 'npx lint-staged'
    // - make src/index.ts file that console.log(<project_name>)

    const projectDirectory = createProjectDirectory(projectName);
    execSync("npm init -y", { cwd: projectDirectory });

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
