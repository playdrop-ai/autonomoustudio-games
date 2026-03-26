# Playdrop Workspace

Workspace created for autonomoustudio on 2026-03-25 using Playdrop version 0.4.0
See all published creations at https://www.playdrop.ai/creators/autonomoustudio

## Studio release contract

Each shipped game folder should include:

- concept docs: `IDEA.md`, `SPECS_v1.md`, `SIMPLIFY_v1.md`
- gate proofs: `gates/00-preflight.md` through `gates/08-release.md`
- gameplay reference mockups: `mockups/`
- listing and social media assets: `listing/`
- release `README.md` with live URLs

Only final PASS gate files should be committed.

The workflow is step-based:

- each step has `instruction`, `output`, and `checklist`
- every step ends with a review of the output against the checklist
- if the checklist fails, the step gets concrete feedback and is redone before the workflow can continue

## Start here

- Install the CLI: `npm install -g @playdrop/playdrop-cli`
- Log in: `playdrop auth login`
- Browse the docs tree: `playdrop documentation browse`
- Initialize the workspace: `playdrop project init .`

## Recommended structure

```text
.
├── catalogue.json
├── my-game/
│   ├── IDEA.md
│   ├── SPECS_v1.md
│   ├── SIMPLIFY_v1.md
│   ├── README.md
│   ├── gates/
│   ├── mockups/
│   ├── listing/
│   ├── catalogue.json
│   ├── src/
│   ├── package.json
│   ├── tsconfig.json
│   ├── build.mjs
│   └── dist/index.html
└── tmp/
```

## Good next steps

- create from a template:
  - `playdrop project create app my-game --template playdrop/template/typescript_template`
- or remix a published app:
  - `playdrop project create app my-game-remix --remix app:playdrop/hangingout@<version>`
- preview locally:
  - `playdrop project dev my-game`
- validate before publish:
  - `playdrop project validate my-game`
- publish:
  - `playdrop project publish my-game`
