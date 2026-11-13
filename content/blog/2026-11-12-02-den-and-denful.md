title: It all started with import-tree
date: 2026-11-12

A few years ago I wanted one tiny thing: load every Nix module in a directory without listing them by hand. That became [import-tree](https://github.com/denful/import-tree), and somehow it became a whole organization, [denful](https://github.com/denful), with docs at [denful.dev](https://denful.dev).

The center of it is [den](https://github.com/denful/den). Den lets you describe hosts, users and homes as *aspects*: small pieces of configuration that know their context and compose. People use it for real things, even in production, which still surprises me.

Around den there is a family of small libraries that each do one job:

- [flake-file](https://github.com/denful/flake-file) generates your `flake.nix` from module options.
- [dendrix](https://github.com/denful/dendrix) is a community distribution on the Dendritic pattern.
- [zen](https://github.com/denful/zen) is a tiny Nix module system.
- [ned](https://github.com/denful/ned) brings stream-based FRP to Nix, inspired by Cycle.js.
- [bend](https://github.com/denful/bend) has lens-based bidirectional parser combinators.

They are all free, tested and documented. If one of them saves you a weekend, that makes me so happy <3
