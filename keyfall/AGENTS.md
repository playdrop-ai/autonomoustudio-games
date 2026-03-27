# Guidelines for Playdrop

## `playdrop project create app` guidelines
- Always use `playdrop project create app` when making new apps because they need to be registered with the Playdrop server. Otherwise future commands will fail.
- Prefer typescript template over simple html (except if mini game focused on 2D and UI)
- Prefer remixing demo project over template if it's closer to what you are making

## workspace guidelines
- Empty catalogue.json at the root of the workspace
- Have an `apps` folder with each app using its own folder inside
- Each app folder with its own catalogue.json describing its metadata (keep folders independant)

## typescript app folder guidelines
- `src` folder with the code
- `catalogue.json` with metadata
- `{my-app.html} ` single file build output referenced in catalogue.json
- typical `build.mjs`, `package.json`, `tsconfig.json`, `template.html`, `README.md`
- optional `tests`, `scripts` 
- use a local `tmp` folder in the app folder itself for download, sripts and tests output

## coding guidelines
- keep things as simple as possible
- do not implement fallbacks, throw clear errors instead when things go wrong
- when not sure about how to do something with the sdk or assets do the following
  1. look at sdk types.
  2. run `playdrop documentation browse` and read the smallest relevant doc page.
  3. download demos and templates to `tmp` folder then read how they do it. 

## DO
- DO implement what is being asked of you, nothing more
- DO copy paste and remix code from templates and demos
- DO install the sdk .tgz file to get types for typescript apps
- DO use `playdrop help` when unsure of what to do
- DO run typescript typecheck and `playdrop project capture` to check your work, then run `playdrop project dev` to let the user review it
- DO keep a SPECS.md document per app with the high level user requirements
- DO use the public `$playdrop` skill when your agent supports Playdrop skills

## DO NOT
- DO NOT overcomplicate things
- DO NOT implement fallback

## COMMON ERRORS TO AVOID
- Try to use the sdk before initialization => do initialization flow after sdk init finishes
- Inventing sdk methods or types => install the sdk .tgz and run typecheck on build
- Re implementing things that already exist => check capabilities of sdk first (including boxel-core and boxel-three) using `playdrop documentation browse`, check templates and demos to see what already exists with `playdrop browse`
