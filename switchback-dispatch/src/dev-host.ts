/// <reference types="playdrop-sdk-types" />

import type {
  ConnectionAPI,
  ConnectionQualityMetrics,
  PlaydropSDK,
  Room,
  RoomBinaryEvent,
  RoomBinaryEventHandler,
  RoomData,
  RoomEvent,
  RoomEventHandler,
  RoomMemberSnapshot,
} from 'playdrop-sdk-types';

export {};

type HostLoadingState = {
  status: 'loading' | 'ready' | 'error';
  message?: string;
  progress?: number;
};

type HarnessPhase = PlaydropSDK['host']['phase'];
type HarnessPauseReason = Parameters<Parameters<PlaydropSDK['host']['onPause']>[0]>[0];
type HarnessAudioPolicy = Parameters<Parameters<PlaydropSDK['host']['onAudioPolicyChange']>[0]>[0];
type HarnessHost = Pick<
  PlaydropSDK['host'],
  'ready' | 'setLoadingState' | 'error' | 'onPhaseChange' | 'onPause' | 'onResume' | 'onAudioPolicyChange'
> & {
  phase: HarnessPhase;
  isPaused: boolean;
  audioEnabled: boolean;
};

type HarnessSdk = {
  host: HarnessHost;
  connection: ConnectionAPI;
  me: PlaydropSDK['me'];
  libs: {
    three: {
      load: (options?: { addons?: string[] }) => Promise<Record<string, unknown>>;
    };
    rapier: {
      load: () => Promise<unknown>;
    };
  };
};

type HarnessMemberState = {
  userId: number;
  username: string;
  roomData: RoomData | null;
};

type HarnessPresenceMessage = {
  type: 'presence-announce';
  senderId: number;
  username: string;
  roomData: RoomData | null;
};

type HarnessPresenceRequestMessage = {
  type: 'presence-request';
  senderId: number;
};

type HarnessPresenceLeaveMessage = {
  type: 'presence-leave';
  senderId: number;
};

type HarnessBinaryMessage = {
  type: 'binary-event';
  senderId: number;
  username: string;
  eventCode: number;
  seq: number;
  ts: number;
  payload: Float64Array;
};

type HarnessEventMessage = {
  type: 'event';
  senderId: number;
  username: string;
  eventType: string;
  seq: number;
  ts: number;
  payload: Record<string, any> | undefined;
};

type HarnessMessage =
  | HarnessPresenceMessage
  | HarnessPresenceRequestMessage
  | HarnessPresenceLeaveMessage
  | HarnessBinaryMessage
  | HarnessEventMessage;

declare global {
  interface Window {
    __starterKitRacingHarnessLoadingState__?: HostLoadingState;
    __starterKitRacingHarnessPhase__?: HarnessPhase;
    __starterKitRacingHarnessReady__?: boolean;
    __starterKitRacingHarnessPromptLoginCount__?: number;
    __starterKitRacingHarnessSetPhase__?: (phase: HarnessPhase) => void;
    __starterKitRacingHarnessSetPaused__?: (paused: boolean, reason?: HarnessPauseReason) => void;
    __starterKitRacingHarnessSetAudioEnabled__?: (enabled: boolean, reason?: HarnessAudioPolicy['reason']) => void;
  }
}

const phaseChangeHandlers = new Set<(phase: HarnessPhase) => void>();
const pauseHandlers = new Set<(reason: HarnessPauseReason) => void>();
const resumeHandlers = new Set<(reason: HarnessPauseReason) => void>();
const audioPolicyHandlers = new Set<(policy: HarnessAudioPolicy) => void>();
let currentPhase: HarnessPhase = 'play';
let paused = false;
let audioPolicy: HarnessAudioPolicy = { enabled: true, reason: 'user_preference' };

function setHarnessPhase(phase: HarnessPhase) {
  if (currentPhase === phase) {
    return;
  }
  currentPhase = phase;
  host.phase = phase;
  window.__starterKitRacingHarnessPhase__ = phase;
  for (const handler of phaseChangeHandlers) {
    handler(phase);
  }
}

const host: HarnessHost = {
  phase: currentPhase,
  isPaused: paused,
  audioEnabled: audioPolicy.enabled,
  ready(): void {
    window.__starterKitRacingHarnessReady__ = true;
    window.__starterKitRacingHarnessLoadingState__ = { status: 'ready' };
  },
  setLoadingState(state: HostLoadingState): void {
    window.__starterKitRacingHarnessLoadingState__ = state;
  },
  error(message?: string): void {
    window.__starterKitRacingHarnessLoadingState__ = {
      status: 'error',
      message,
    };
  },
  onPhaseChange(cb) {
    phaseChangeHandlers.add(cb);
    return () => {
      phaseChangeHandlers.delete(cb);
    };
  },
  onPause(cb) {
    pauseHandlers.add(cb);
    return () => {
      pauseHandlers.delete(cb);
    };
  },
  onResume(cb) {
    resumeHandlers.add(cb);
    return () => {
      resumeHandlers.delete(cb);
    };
  },
  onAudioPolicyChange(cb) {
    audioPolicyHandlers.add(cb);
    return () => {
      audioPolicyHandlers.delete(cb);
    };
  },
};

function emitPauseState(nextPaused: boolean, reason: HarnessPauseReason) {
  if (paused === nextPaused) {
    return;
  }
  paused = nextPaused;
  host.isPaused = nextPaused;
  const handlers = nextPaused ? pauseHandlers : resumeHandlers;
  for (const handler of handlers) {
    handler(reason);
  }
}

function emitAudioPolicy(enabled: boolean, reason: HarnessAudioPolicy['reason']) {
  if (audioPolicy.enabled === enabled && audioPolicy.reason === reason) {
    return;
  }
  audioPolicy = { enabled, reason };
  host.audioEnabled = enabled;
  for (const handler of audioPolicyHandlers) {
    handler({ ...audioPolicy });
  }
}

let sdkPromise: Promise<HarnessSdk> | null = null;

const DEFAULT_QUALITY: ConnectionQualityMetrics = {
  pingMs: 8,
  jitterMs: 0,
  interpDelayMs: 0,
};

function clonePayload(payload: Float64Array) {
  return new Float64Array(payload);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) || 1;
}

function getHarnessConfig() {
  const params = new URLSearchParams(window.location.search);
  const username = params.get('harnessUser')?.trim() || 'local-test';
  const roomName = params.get('harnessRoom')?.trim() || 'starter-kit-racing';
  const joinDelayMs = Number.parseInt(params.get('harnessJoinDelayMs') ?? '0', 10);
  const phaseAfterMs = Number.parseInt(params.get('harnessPhaseAfterMs') ?? '', 10);
  const initialPhase: HarnessPhase =
    params.get('harnessPhase') === 'preview' ? 'preview' : 'play';
  const nextPhaseParam = params.get('harnessNextPhase');
  const nextPhase: HarnessPhase | null =
    nextPhaseParam === 'preview' || nextPhaseParam === 'play' ? nextPhaseParam : null;
  const loggedIn =
    params.get('harnessLoggedIn') === '1' || params.get('harnessLoggedIn') === 'true';
  const promptLoginLogsIn = params.get('harnessPromptLoginLogsIn') !== '0';
  const audioEnabled =
    params.get('harnessAudioEnabled') !== '0' && params.get('harnessAudioEnabled') !== 'false';
  const paused =
    params.get('harnessPaused') === '1' || params.get('harnessPaused') === 'true';
  return {
    username,
    roomName,
    joinDelayMs: Number.isFinite(joinDelayMs) ? Math.max(0, joinDelayMs) : 0,
    initialPhase,
    nextPhase,
    phaseAfterMs: Number.isFinite(phaseAfterMs) ? Math.max(0, phaseAfterMs) : null,
    loggedIn,
    promptLoginLogsIn,
    audioEnabled,
    paused,
    userId: hashString(`${roomName}:${username}`),
  };
}

function createRoomMemberSnapshot(member: HarnessMemberState): RoomMemberSnapshot {
  return {
    userId: member.userId,
    username: member.username,
    selectedAvatarId: 0,
    selectedProfileAssetRef: 'playdrop/profile/default',
    appData: null,
    roomData: member.roomData,
  };
}

function createHarnessRoom(username: string, userId: number, roomName: string): Room {
  let nextSeq = 1;
  let currentRoomData: RoomData | null = null;
  let disposed = false;
  const roomId = hashString(roomName);
  const channel = new BroadcastChannel(`starter-kit-racing-harness:${roomName}`);
  const usersChangeHandlers = new Set<(users: Array<RoomMemberSnapshot>) => void>();
  const eventHandlers = new Map<string, Set<RoomEventHandler>>();
  const binaryHandlers = new Map<number, Set<RoomBinaryEventHandler>>();
  const members = new Map<number, HarnessMemberState>();

  const emitUsers = () => {
    room.users = Array.from(members.values())
      .sort((left, right) => left.username.localeCompare(right.username))
      .map((member) => createRoomMemberSnapshot(member));
    for (const handler of usersChangeHandlers) {
      handler(room.users);
    }
  };

  const upsertMember = (member: HarnessMemberState) => {
    const existing = members.get(member.userId);
    if (
      existing &&
      existing.username === member.username &&
      existing.roomData?.seq === member.roomData?.seq
    ) {
      return;
    }
    members.set(member.userId, member);
    emitUsers();
  };

  const post = (message: HarnessMessage) => {
    if (disposed) {
      return;
    }
    channel.postMessage(message);
  };

  const announcePresence = () => {
    post({
      type: 'presence-announce',
      senderId: userId,
      username,
      roomData: currentRoomData,
    });
  };

  const leaveRoom = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    post({ type: 'presence-leave', senderId: userId });
    channel.close();
    members.clear();
    usersChangeHandlers.clear();
    eventHandlers.clear();
    binaryHandlers.clear();
  };

  const localMember = () =>
    ({
      userId,
      username,
      roomData: currentRoomData,
    }) satisfies HarnessMemberState;

  channel.addEventListener('message', (rawEvent: MessageEvent<HarnessMessage>) => {
    const message = rawEvent.data;
    if (!message || message.senderId === userId) {
      return;
    }

    switch (message.type) {
      case 'presence-request': {
        announcePresence();
        break;
      }
      case 'presence-announce': {
        upsertMember({
          userId: message.senderId,
          username: message.username,
          roomData: message.roomData,
        });
        break;
      }
      case 'presence-leave': {
        if (members.delete(message.senderId)) {
          emitUsers();
        }
        break;
      }
      case 'binary-event': {
        upsertMember({
          userId: message.senderId,
          username: message.username,
          roomData: members.get(message.senderId)?.roomData ?? null,
        });
        const handlers = binaryHandlers.get(message.eventCode);
        if (!handlers || handlers.size === 0) {
          break;
        }
        const event: RoomBinaryEvent = {
          username: message.username,
          seq: message.seq,
          ts_event: message.ts,
          ts_arrival: Date.now(),
          payload: clonePayload(message.payload),
        };
        for (const handler of handlers) {
          handler(event);
        }
        break;
      }
      case 'event': {
        upsertMember({
          userId: message.senderId,
          username: message.username,
          roomData: members.get(message.senderId)?.roomData ?? null,
        });
        const handlers = eventHandlers.get(message.eventType);
        if (!handlers || handlers.size === 0) {
          break;
        }
        const event: RoomEvent = {
          username: message.username,
          seq: message.seq,
          ts_event: message.ts,
          ts_arrival: Date.now(),
          payload: message.payload,
        };
        for (const handler of handlers) {
          handler(event);
        }
        break;
      }
    }
  });

  const room: Room = {
    id: roomId,
    users: [],
    onUsersChange(cb) {
      usersChangeHandlers.add(cb);
      cb(room.users);
      return () => {
        usersChangeHandlers.delete(cb);
      };
    },
    onEvent(type, handler) {
      const handlers = eventHandlers.get(type) ?? new Set<RoomEventHandler>();
      handlers.add(handler);
      eventHandlers.set(type, handlers);
      return () => {
        handlers.delete(handler);
      };
    },
    async sendEvent(type, payload) {
      const ts = Date.now();
      post({
        type: 'event',
        senderId: userId,
        username,
        eventType: type,
        seq: nextSeq++,
        ts,
        payload,
      });
    },
    onBinaryEvent(eventCode, handler) {
      const handlers = binaryHandlers.get(eventCode) ?? new Set<RoomBinaryEventHandler>();
      handlers.add(handler);
      binaryHandlers.set(eventCode, handlers);
      return () => {
        handlers.delete(handler);
      };
    },
    async sendBinaryEvent(eventCode, payload) {
      const ts = Date.now();
      post({
        type: 'binary-event',
        senderId: userId,
        username,
        eventCode,
        seq: nextSeq++,
        ts,
        payload: clonePayload(payload),
      });
    },
    getBufferedEvents() {
      return [];
    },
    getBufferedBinaryEvents() {
      return [];
    },
    async leave() {
      leaveRoom();
    },
    async updateRoomData(data) {
      currentRoomData = {
        data: { ...data },
        seq: nextSeq++,
        ts_event: Date.now(),
        ts_arrival: Date.now(),
      };
      upsertMember(localMember());
      announcePresence();
    },
  };

  members.set(userId, localMember());
  emitUsers();
  announcePresence();
  post({ type: 'presence-request', senderId: userId });
  window.addEventListener(
    'pagehide',
    () => {
      leaveRoom();
    },
    { once: true },
  );
  return room;
}

async function createSdk(): Promise<HarnessSdk> {
  const [
    threeModule,
    gltfLoaderModule,
    effectComposerModule,
    renderPassModule,
    gtaoPassModule,
    unrealBloomPassModule,
    outputPassModule,
    rapierModule,
  ] = await Promise.all([
    import('three'),
    import('three/addons/loaders/GLTFLoader.js'),
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/GTAOPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js'),
    import('@dimforge/rapier3d-compat'),
  ]);

  const rapier = rapierModule.default;
  await rapier.init();

  const connectionStatusHandlers = new Set<(status: 'online' | 'connecting' | 'offline') => void>();
  const qualityHandlers = new Set<(quality: ConnectionQualityMetrics) => void>();
  const connection: ConnectionAPI = {
    getStatus() {
      return 'online';
    },
    getQuality() {
      return DEFAULT_QUALITY;
    },
    serverNow() {
      return Date.now();
    },
    renderTime() {
      return Date.now();
    },
    onStatusChange(cb) {
      connectionStatusHandlers.add(cb);
      cb('online');
      return () => {
        connectionStatusHandlers.delete(cb);
      };
    },
    onQualityChange(cb) {
      qualityHandlers.add(cb);
      cb(DEFAULT_QUALITY);
      return () => {
        qualityHandlers.delete(cb);
      };
    },
  };

  const {
    username,
    roomName,
    joinDelayMs,
    userId,
    initialPhase,
    nextPhase,
    phaseAfterMs,
    loggedIn,
    promptLoginLogsIn,
    audioEnabled,
    paused: startPaused,
  } = getHarnessConfig();
  currentPhase = initialPhase;
  host.phase = initialPhase;
  paused = startPaused;
  host.isPaused = startPaused;
  audioPolicy = {
    enabled: audioEnabled,
    reason: audioEnabled ? 'user_preference' : 'host_overlay',
  };
  host.audioEnabled = audioEnabled;
  window.__starterKitRacingHarnessPhase__ = initialPhase;
  window.__starterKitRacingHarnessReady__ = false;
  window.__starterKitRacingHarnessPromptLoginCount__ = 0;
  window.__starterKitRacingHarnessSetPhase__ = (phase) => {
    setHarnessPhase(phase);
  };
  window.__starterKitRacingHarnessSetPaused__ = (nextPaused, reason = 'host_overlay') => {
    emitPauseState(nextPaused, reason);
  };
  window.__starterKitRacingHarnessSetAudioEnabled__ = (
    enabled,
    reason = enabled ? 'user_preference' : 'host_overlay',
  ) => {
    emitAudioPolicy(enabled, reason);
  };
  if (nextPhase && phaseAfterMs !== null) {
    window.setTimeout(() => {
      setHarnessPhase(nextPhase);
    }, phaseAfterMs);
  }

  let isLoggedIn = loggedIn;
  const authChangeHandlers = new Set<
    Parameters<PlaydropSDK['me']['onAuthChange']>[0]
  >();
  const emitAuthChange = () => {
    const state = {
      isLoggedIn: me.isLoggedIn,
      userId: me.userId,
      username: me.username,
      selectedProfileAssetRef: me.selectedProfileAssetRef,
    } as const;
    for (const handler of authChangeHandlers) {
      handler(state);
    }
  };
  const me: PlaydropSDK['me'] = {
    isLoggedIn,
    userId: isLoggedIn ? userId : null,
    username: isLoggedIn ? username : null,
    selectedAvatarId: 0,
    selectedProfileAssetRef: 'playdrop/profile/default',
    appData: null,
    async login() {
      isLoggedIn = true;
      me.isLoggedIn = true;
      me.userId = userId;
      me.username = username;
      emitAuthChange();
    },
    async promptLogin() {
      window.__starterKitRacingHarnessPromptLoginCount__ =
        (window.__starterKitRacingHarnessPromptLoginCount__ ?? 0) + 1;
      if (!promptLoginLogsIn) {
        return;
      }
      await me.login();
    },
    onAuthChange(cb) {
      authChangeHandlers.add(cb);
      cb({
        isLoggedIn: me.isLoggedIn,
        userId: me.userId,
        username: me.username,
        selectedProfileAssetRef: me.selectedProfileAssetRef,
      });
      return () => {
        authChangeHandlers.delete(cb);
      };
    },
    getSelectedProfileAssetRef() {
      return me.selectedProfileAssetRef;
    },
    async updateAppData() {
      return {
        data: {},
        seq: 0,
        ts_event: Date.now(),
        ts_arrival: Date.now(),
      };
    },
    async joinRoom() {
      if (!me.isLoggedIn || !me.username || !me.userId) {
        throw new Error('[starter-kit-racing] harness joinRoom requires login');
      }
      if (joinDelayMs > 0) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, joinDelayMs);
        });
      }
      return createHarnessRoom(me.username, me.userId, roomName);
    },
  } satisfies PlaydropSDK['me'];

  return {
    host,
    connection,
    me,
    libs: {
      three: {
        load: async () => ({
          ...threeModule,
          GLTFLoader: gltfLoaderModule.GLTFLoader,
          EffectComposer: effectComposerModule.EffectComposer,
          RenderPass: renderPassModule.RenderPass,
          GTAOPass: gtaoPassModule.GTAOPass,
          UnrealBloomPass: unrealBloomPassModule.UnrealBloomPass,
          OutputPass: outputPassModule.OutputPass,
        }),
      },
      rapier: {
        load: async () => rapier,
      },
    },
  };
}

const harnessPlaydrop = {
  host,
  init: async (): Promise<HarnessSdk> => {
    if (!sdkPromise) {
      sdkPromise = createSdk();
    }
    return sdkPromise;
  },
} as unknown as NonNullable<Window['playdrop']>;

window.playdrop = harnessPlaydrop;
