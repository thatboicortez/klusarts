// Minificeert bestanden voor build.py.
// Gebruik: node tools/minify.mjs jobs.json
//   jobs.json = [{ "type": "css" | "js" | "html", "in": "pad", "out": "pad" }, ...]
import fs from "node:fs";
import path from "node:path";
import CleanCSS from "clean-css";
import { minify as minifyJs } from "terser";
import { minify as minifyHtml } from "html-minifier-terser";

const jobs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const terserOptions = {
  ecma: 2018,
  compress: { passes: 2, drop_console: false },
  mangle: true,
  format: { comments: false },
};

for (const job of jobs) {
  const src = fs.readFileSync(job.in, "utf8");
  let out;
  if (job.type === "css") {
    const res = new CleanCSS({ level: 1 }).minify(src);
    if (res.errors.length) throw new Error(job.in + ": " + res.errors.join("; "));
    out = res.styles;
  } else if (job.type === "js") {
    const res = await minifyJs(src, terserOptions);
    out = res.code;
  } else if (job.type === "html") {
    out = await minifyHtml(src, {
      collapseWhitespace: true,
      conservativeCollapse: true,   // nooit woorden/spaties tussen inline elementen laten verdwijnen
      removeComments: true,
      removeRedundantAttributes: false,
      useShortDoctype: true,
      minifyCSS: true,
      minifyJS: terserOptions,
      processScripts: ["application/ld+json", "importmap"],
    });
  } else {
    throw new Error("onbekend type: " + job.type);
  }
  fs.mkdirSync(path.dirname(job.out), { recursive: true });
  fs.writeFileSync(job.out, out);
}
console.log("minified", jobs.length, "files");
