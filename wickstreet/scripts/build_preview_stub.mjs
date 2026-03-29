import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const sourcePath = resolve('dist/index.html');
const targetPath = resolve('tmp/preview/index.html');

const html = readFileSync(sourcePath, 'utf8');
const sdkScript = '<script src="https://assets.playdrop.ai/sdk/playdrop.js"></script>';
const stubScript = `<script>
window.playdrop = {
  host: {
    setLoadingState(state) {
      console.log('[preview-stub][host]', state);
    }
  },
  async init() {
    return {
      host: {
        setLoadingState(state) {
          console.log('[preview-stub][sdk.host]', state);
        },
        deployment: 'dev',
        platform: 'web',
        sdkVersion: 'preview-stub',
        sdkBuild: 0,
        mode: 'dev'
      },
      me: {
        isLoggedIn: false,
        username: 'preview',
        displayName: 'Preview',
        avatarUrl: '',
        appData: {
          async get() { return null; },
          async set() {}
        }
      },
      app: {
        authMode: 'OPTIONAL'
      }
    };
  }
};
</script>`;

if (!html.includes(sdkScript)) {
  throw new Error('preview_stub_source_missing_sdk_script');
}

mkdirSync(dirname(targetPath), { recursive: true });
writeFileSync(targetPath, html.replace(sdkScript, stubScript), 'utf8');
console.log(`[wickstreet] Wrote preview stub to ${targetPath}`);
