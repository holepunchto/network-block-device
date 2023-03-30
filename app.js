const nbdi = require("./index");
const fs = require("fs");

const t = new nbdi("notAFunction", "notAFunction", 1024);

const mySock = "/tmp/unix10";

t.connect(mySock);

process.on("SIGINT", function () {
  fs.unlinkSync(mySock);
  process.exit();
});

process.on("exit", () => {
  if (fs.existsSync(mySock)) {
    fs.unlinkSync(mySock);
  }
});
