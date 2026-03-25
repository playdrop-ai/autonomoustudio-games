# Playdrop Workspace

Workspace created for autonomoustudio on 2026-03-25 using Playdrop version 0.4.0
See all published creations at https://www.playdrop.ai/creators/autonomoustudio

## Start here

- Install the CLI: `npm install -g @playdrop/playdrop-cli`
- Log in: `playdrop auth login`
- Browse the docs tree: `playdrop documentation browse`
- Initialize the workspace: `playdrop project init .`

## Recommended structure

```text
.
├── catalogue.json
├── apps/
│   └── my-game/
│       ├── catalogue.json
│       ├── src/
│       ├── package.json
│       ├── tsconfig.json
│       ├── build.mjs
│       └── dist/index.html
└── tmp/
```

## Good next steps

- create from a template:
  - `playdrop project create app my-app --template playdrop/template/typescript_template`
- or remix a published app:
  - `playdrop project create app my-remix --remix app:playdrop/hangingout@<version>`
- preview locally:
  - `playdrop project dev my-app`
- validate before publish:
  - `playdrop project validate .`
- publish:
  - `playdrop project publish .`
