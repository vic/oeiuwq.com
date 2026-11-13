{
  description = "oeiuwq.com: every subdomain from one Go binary with Elm apps";

  inputs = {
    nixpkgs.url = "https://nixos.org/channels/nixpkgs-unstable/nixexprs.tar.xz";
  };

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAll = f: nixpkgs.lib.genAttrs systems (s: f s nixpkgs.legacyPackages.${s});
    in
    {
      packages = forAll (
        _: pkgs: {
          default = pkgs.buildGoModule {
            pname = "oeiuwq";
            version = "0.1.0";
            src = ./.;
            vendorHash = null; # no Go dependencies
            subPackages = [ "cmd/oeiuwq" ];
            env.CGO_ENABLED = "0";
            # internal/site/static/*.js are the committed Elm bundles (`just web` regenerates them)
            meta.mainProgram = "oeiuwq";
          };
        }
      );

      devShells = forAll (
        _: pkgs: {
          default = pkgs.mkShell {
            packages = [
              pkgs.go
              pkgs.gopls
              pkgs.elmPackages.elm
              pkgs.elmPackages.elm-format
              pkgs.elmPackages.elm-test
              pkgs.just
              pkgs.watchexec
              pkgs.gh
            ];
          };
        }
      );

      formatter = forAll (_: pkgs: pkgs.nixfmt);
    };
}
