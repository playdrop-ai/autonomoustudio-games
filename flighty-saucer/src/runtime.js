const sdk = globalThis.__FLIGHTY_SDK__;
const THREE = globalThis.__FLIGHTY_THREE__;

if (!sdk) throw new Error('[flighty-saucer] PlayDrop SDK was not initialized');
if (!THREE) throw new Error('[flighty-saucer] PlayDrop Three.js runtime was not loaded');

export { sdk, THREE };
