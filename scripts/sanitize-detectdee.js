// Sanitizes DetectDee's data.json: DetectDee ships invalid JSON escape
// sequences (e.g. "\%5B") that its Go loader tolerates but strict JSON.parse
// rejects. We fix them by dropping backslashes that don't form a valid JSON
// escape, while preserving valid escape pairs (\\ \" \/ \b \f \n \r \t \uXXXX).
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "lib", "data", "detectdee.json");
const s = fs.readFileSync(file, "utf-8");
const valid = new Set(['"', "\\", "/", "b", "f", "n", "r", "t", "u"]);

let out = "";
for (let i = 0; i < s.length; i++) {
  if (s[i] === "\\") {
    const next = s[i + 1];
    if (next !== undefined && valid.has(next)) {
      out += s[i] + next; // keep valid escape pair, consume both
      i++;
    } else {
      // drop the stray backslash, keep the following char
      if (next !== undefined) { out += next; i++; }
    }
  } else {
    out += s[i];
  }
}

try {
  const parsed = JSON.parse(out);
  fs.writeFileSync(file, out, "utf-8");
  console.log("CLEAN OK. sites:", Object.keys(parsed).length, "| removed", s.length - out.length, "char(s)");
} catch (e) {
  console.log("STILL BAD:", e.message);
}
