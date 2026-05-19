const fs = require("fs");
const action = process.argv[2];

if (action === "restore") {
  if (fs.existsSync("next.config.bak.ts")) {
    fs.copyFileSync("next.config.bak.ts", "next.config.ts");
    fs.unlinkSync("next.config.bak.ts");
    console.log("Restored original config");
  }
} else {
  fs.copyFileSync("next.config.ts", "next.config.bak.ts");
  fs.copyFileSync("next.config.export.ts", "next.config.ts");
  console.log("Switched to export config");
}
