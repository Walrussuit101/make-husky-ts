import path from "path";
import { readFileSync, writeFileSync, copyFileSync } from "fs";

const buildDirPath = path.join(__dirname, "build");
const packagePath = path.join(buildDirPath, "package.json");
const readmePath = path.join(__dirname, "README.md");
const licensePath = path.join(__dirname, "LICENSE");

// update build package file
const packageStr = readFileSync(packagePath).toString("utf8");
const packageObj = JSON.parse(packageStr);

delete packageObj.scripts;
delete packageObj.devDependencies;
delete packageObj["lint-staged"];
delete packageObj.prettier;
packageObj.bin = "index.js";

writeFileSync(packagePath, JSON.stringify(packageObj, undefined, 2));

// copy README and LICENSE file to build dir
copyFileSync(readmePath, path.join(buildDirPath, "README.md"));
copyFileSync(licensePath, path.join(buildDirPath, "LICENSE"));
