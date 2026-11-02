---
name: "deploy-cloudbase"
description: "Deploy Astro static site to Tencent CloudBase hosting via CLI. Invoke when user wants to deploy or update the website, or mentions CloudBase deployment."
---

# Deploy to CloudBase

Deploy the Astro static site to Tencent CloudBase static hosting.

## Strategy

Use **local build + `tcb hosting deploy`** (not `tcb app deploy`). The CloudBase cloud build environment does not have pnpm installed, causing `tcb app deploy` to fail. Instead, build locally and upload the `dist/` directory directly.

## Prerequisites

- CloudBase CLI installed (`@cloudbase/cli`, check with `tcb --version`)
- CLI logged in (`tcb login`, check with `tcb login status`)
- `cloudbaserc.json` exists in project root with `envId`
- pnpm installed locally for building

## Steps

1. **Check CLI availability**: Run `tcb --version`. If not installed, run `npm i -g @cloudbase/cli@latest`.

2. **Check login status**: Run `tcb login status`. If not logged in, run `tcb login` and ask the user to complete browser authorization.

3. **Read envId**: Read `cloudbaserc.json` to get `envId`. If missing or placeholder, ask the user.

4. **Local build**: Run `pnpm build` in the project root. Verify `dist/` directory is generated.

5. **Deploy**: Run the following command (replace `<envId>` with the actual envId):

   ```bash
   tcb hosting deploy ./dist --env-id <envId> --yes
   ```

6. **Report result**: After deployment completes, report:
   - Access URL (printed by CLI, format: `https://<envId>-<appId>.tcloudbaseapp.com`)
   - Number of files uploaded
   - CDN cache note (may take a few minutes to refresh)

7. **Verify astro.config.mjs**: Ensure the `site` URL matches the actual CloudBase access domain printed by CLI. Update if different.

## cloudbaserc.json Reference

```json
{
  "version": "2.0",
  "envId": "<YOUR_ENV_ID>",
  "app": {
    "serviceName": "jlx-academic-homepage",
    "framework": "static",
    "installCommand": "pnpm install",
    "buildCommand": "pnpm build",
    "outputDir": "dist",
    "deployPath": "/"
  }
}
```

> Note: The `app` config is kept for reference but NOT used in the `tcb hosting deploy` workflow. Only `envId` is read from this file.

## Notes

- `tcb hosting deploy` overwrites files at the same path with no versioning. For version management, `tcb app deploy` would be needed but requires npm-compatible build commands.
- CDN cache may delay updates by 5-10 minutes. Use browser incognito mode to verify.
- After deploy, the CLI prints the actual access domain — always cross-check with `astro.config.mjs` `site` value.
