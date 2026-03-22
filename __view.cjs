const fs = require("fs");

const [, , path, startArg, endArg] = process.argv;
const start = Number(startArg);
const end = Number(endArg);
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

for (let index = start; index <= end && index <= lines.length; index += 1) {
  console.log(`${index}:${lines[index - 1]}`);
}
