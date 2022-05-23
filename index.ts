import { program } from "commander";

import packageFile from "./package.json";

const mainProc = (projectName: string) => {
    // - make sure project directory doesn't exists, then create it
    // - install deps
    // - add package file keys (prettier / lint-staged), add prepare script ('husky install'), add start script ('ts-node src/index.ts')
    // - add husky precommit that calls 'npx lint-staged'
    // - make src/index.ts file that console.log(<project_name>)
    // - npm init -y

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
        mainProc(projectName);
    });

// accept input
program.parse();
