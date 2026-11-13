// node bench/run.js bench.js ../data [program ...]: times every logic preset, or the given programs.
const fs = require("fs");
const [bundle, dir, ...progs] = process.argv.slice(2);
const Elm = (new Function("var scope = {}; " + fs.readFileSync(bundle, "utf8").replace("(this)", "(scope)") + "; return scope.Elm;"))();
const read = (f) => JSON.parse(fs.readFileSync(dir + "/" + f, "utf8"));
let t0 = Date.now();
const app = Elm.Bench.init({ flags: { repos: read("repos.json"), stars: read("stars.json"), contrib: read("contrib.json") } });
console.log(`facts loaded in ${Date.now() - t0} ms`);
const jobs = progs.length ? progs : [...Array(20).keys()].map(String);
let i = 0;
app.ports.done.subscribe((msg) => {
  if (msg === "end") return;
  console.log(`${Date.now() - t0} ms | ${msg}`);
  i += 1;
  if (i < jobs.length) { t0 = Date.now(); app.ports.run.send(jobs[i]); }
});
t0 = Date.now(); app.ports.run.send(jobs[0]);
