/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';

import type { LoadedTrackState, TrackRepository } from './runtime-track';
import { applyLauncherIcon, ROUTE_ICON } from '../runtime/launcher-icons';

type PublicTrackCard = {
  kind: 'public';
  creatorUsername: string;
  assetName: string;
  displayName: string;
  description: string | null;
  assetRef: string;
  previewUrl: string | null;
  likeCount: number;
  createdAt: string;
};

type OwnedTrackVersionSummary = {
  assetRef: string;
  previewUrl: string | null;
  createdAt: string;
};

type OwnedTrackSummary = {
  creatorUsername: string;
  assetName: string;
  displayName: string | null;
  description: string | null;
  currentVersion: OwnedTrackVersionSummary | null;
  latestVersion: OwnedTrackVersionSummary | null;
  latestPublicVersion: OwnedTrackVersionSummary | null;
};

type OwnedTrackCard = {
  kind: 'owned';
  creatorUsername: string;
  assetName: string;
  displayName: string;
  description: string | null;
  assetRef: string;
  previewUrl: string | null;
  likeCount: number;
  createdAt: string;
};

type TrackListItem = PublicTrackCard | OwnedTrackCard;
export type TrackListTab = 'official' | 'you' | 'community';

type TrackListState = {
  items: TrackListItem[];
  loading: boolean;
  error: string | null;
};

export type TrackSelectorTarget = {
  kind: 'public' | 'owned';
  assetRef: string;
};

type PublicTrackListResponse = {
  assets: Array<{
    creatorUsername: string;
    name: string;
    displayName: string;
    description?: string | null;
    createdAt: string;
    likeCount?: number | null;
    currentVersion?: {
      revision: number;
      fileManifest?: unknown;
    } | null;
  }>;
  pagination?: {
    hasMore?: boolean;
  } | null;
};

const TRACK_SELECTOR_STYLE_ID = 'starter-kit-racing-track-selector-style';
const OFFICIAL_CREATOR_USERNAME = 'playdrop';
const OFFICIAL_TRACK_ORDER = [
  'starter-kit-racing-stock',
  'switchback-run',
  'oval-sprint',
] as const;
const OFFICIAL_TRACK_ORDER_INDEX = new Map<string, number>(
  OFFICIAL_TRACK_ORDER.map((assetName, index) => [assetName, index]),
);
const TAB_LABELS: Record<TrackListTab, string> = {
  official: 'Official',
  you: 'You',
  community: 'Community',
};
const FETCH_PAGE_SIZE = 24;
const FETCH_MAX_PAGES = 12;

function buildPublicAssetRef(creatorUsername: string, assetName: string, revision: number) {
  return `asset:${creatorUsername}/${assetName}@r${revision}`;
}

function resolvePreviewUrl(value: unknown): string | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const files = Array.isArray((value as { files?: unknown }).files)
    ? (value as { files: Array<{ role?: unknown; url?: unknown }> }).files
    : [];
  for (const role of ['preview', 'thumbnail', 'image', 'cover', 'primary']) {
    const file = files.find((candidate) => candidate?.role === role && typeof candidate.url === 'string');
    if (typeof file?.url === 'string' && file.url.trim().length > 0) {
      return file.url;
    }
  }
  return null;
}

function normalizeUsername(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseAssetRefCreatorUsername(assetRef: string | null): string | null {
  if (!assetRef) {
    return null;
  }
  const match = /^asset:([^/]+)\/[^@]+@r\d+$/i.exec(assetRef.trim());
  if (!match) {
    return null;
  }
  return normalizeUsername(match[1] ?? '') || null;
}

function getOwnedTrackPrimaryVersion(item: OwnedTrackSummary) {
  return item.currentVersion ?? item.latestVersion ?? item.latestPublicVersion ?? null;
}

function getOwnedTrackPreviewUrl(item: OwnedTrackSummary) {
  return item.currentVersion?.previewUrl
    ?? item.latestVersion?.previewUrl
    ?? item.latestPublicVersion?.previewUrl
    ?? null;
}

function formatLikeCount(value: number) {
  return `${value.toLocaleString()} ${value === 1 ? 'like' : 'likes'}`;
}

function formatRelativeAge(createdAt: string) {
  const createdAtMs = Date.parse(createdAt);
  if (!Number.isFinite(createdAtMs)) {
    return 'unknown age';
  }
  const diffMs = Math.max(0, Date.now() - createdAtMs);
  const minuteMs = 60_000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const monthMs = 30 * dayMs;
  const yearMs = 365 * dayMs;
  if (diffMs < minuteMs) {
    return 'just now';
  }
  if (diffMs < hourMs) {
    return `${Math.floor(diffMs / minuteMs)}m ago`;
  }
  if (diffMs < dayMs) {
    return `${Math.floor(diffMs / hourMs)}h ago`;
  }
  if (diffMs < monthMs) {
    return `${Math.floor(diffMs / dayMs)}d ago`;
  }
  if (diffMs < yearMs) {
    return `${Math.floor(diffMs / monthMs)}mo ago`;
  }
  return `${Math.floor(diffMs / yearMs)}y ago`;
}

function formatTrackMeta(item: TrackListItem) {
  return `@${item.creatorUsername} . ${formatLikeCount(item.likeCount)} . ${formatRelativeAge(item.createdAt)}`;
}

function mapPublicTrackCards(response: PublicTrackListResponse): PublicTrackCard[] {
  return response.assets
    .filter((asset) => typeof asset.currentVersion?.revision === 'number')
    .map((asset) => ({
      kind: 'public' as const,
      creatorUsername: asset.creatorUsername,
      assetName: asset.name,
      displayName: asset.displayName || asset.name,
      description: asset.description ?? null,
      assetRef: buildPublicAssetRef(asset.creatorUsername, asset.name, asset.currentVersion!.revision),
      previewUrl: resolvePreviewUrl(asset.currentVersion?.fileManifest ?? null),
      likeCount: Number.isInteger(asset.likeCount) ? Number(asset.likeCount) : 0,
      createdAt: asset.createdAt,
    }));
}

function mapOwnedTrackCards(items: OwnedTrackSummary[]): OwnedTrackCard[] {
  return items
    .map((item) => {
      const version = getOwnedTrackPrimaryVersion(item);
      if (!version) {
        return null;
      }
      return {
        kind: 'owned' as const,
        creatorUsername: item.creatorUsername,
        assetName: item.assetName,
        displayName: item.displayName?.trim() || item.assetName,
        description: item.description ?? null,
        assetRef: version.assetRef,
        previewUrl: getOwnedTrackPreviewUrl(item),
        likeCount: 0,
        createdAt: version.createdAt,
      };
    })
    .filter((item): item is OwnedTrackCard => Boolean(item));
}

function compareCreatedAtDescending(left: TrackListItem, right: TrackListItem) {
  const leftMs = Date.parse(left.createdAt);
  const rightMs = Date.parse(right.createdAt);
  if (Number.isFinite(leftMs) && Number.isFinite(rightMs) && leftMs !== rightMs) {
    return rightMs - leftMs;
  }
  if (Number.isFinite(leftMs) && !Number.isFinite(rightMs)) {
    return -1;
  }
  if (!Number.isFinite(leftMs) && Number.isFinite(rightMs)) {
    return 1;
  }
  return left.displayName.localeCompare(right.displayName);
}

function sortOfficialTracks(items: PublicTrackCard[]) {
  return [...items].sort((left, right) => {
    const leftIndex = OFFICIAL_TRACK_ORDER_INDEX.get(left.assetName);
    const rightIndex = OFFICIAL_TRACK_ORDER_INDEX.get(right.assetName);
    const leftKnown = typeof leftIndex === 'number';
    const rightKnown = typeof rightIndex === 'number';
    if (leftKnown && rightKnown && leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
    if (leftKnown !== rightKnown) {
      return leftKnown ? -1 : 1;
    }
    return compareCreatedAtDescending(left, right);
  });
}

function sortOwnedTracks(items: OwnedTrackCard[]) {
  return [...items].sort(compareCreatedAtDescending);
}

function sortCommunityTracks(items: PublicTrackCard[]) {
  return [...items].sort((left, right) => {
    if (left.likeCount !== right.likeCount) {
      return right.likeCount - left.likeCount;
    }
    return compareCreatedAtDescending(left, right);
  });
}

function applyTrackSelectorStyles() {
  if (document.getElementById(TRACK_SELECTOR_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = TRACK_SELECTOR_STYLE_ID;
  style.textContent = `
    .track-selector-launcher-rail {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 22;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .track-selector-launcher {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 16px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 999px;
      background: rgba(7, 11, 20, 0.78);
      color: #f8fafc;
      font: inherit;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.28);
    }

    .track-selector-launcher.is-icon-only {
      min-width: 42px;
      width: 42px;
      padding: 0;
      letter-spacing: 0;
    }

    .track-selector-launcher.is-icon-only svg {
      width: 18px;
      height: 18px;
      display: block;
      flex: 0 0 auto;
    }

    .track-selector-launcher:hover {
      background: rgba(15, 23, 42, 0.9);
    }

    .track-selector-overlay {
      position: fixed;
      inset: 0;
      z-index: 30;
      display: flex;
      justify-content: center;
      padding: 20px;
      background: rgba(2, 6, 23, 0.58);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
    }

    .track-selector-overlay[hidden] {
      display: none;
    }

    .track-selector-dialog {
      width: min(980px, 100%);
      max-height: calc(100vh - 40px);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(8, 15, 27, 0.94);
      box-shadow: 0 30px 90px rgba(2, 6, 23, 0.42);
    }

    .track-selector-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 20px 14px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }

    .track-selector-header h2 {
      margin: 0;
      font-size: clamp(28px, 3vw, 38px);
      line-height: 0.94;
      letter-spacing: -0.04em;
      color: #f8fafc;
    }

    .track-selector-header-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
    }

    .track-selector-tabs {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 20px 16px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    .track-selector-tab-list {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .track-selector-tab {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.03);
      color: #cbd5e1;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      cursor: pointer;
    }

    .track-selector-tab:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }

    .track-selector-tab.is-active {
      background: rgba(248, 212, 76, 0.14);
      border-color: rgba(248, 212, 76, 0.56);
      color: #f8fafc;
    }

    .track-selector-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 16px 20px 20px;
    }

    .track-selector-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .track-selector-row {
      display: grid;
      grid-template-columns: 72px minmax(0, 1fr) auto;
      gap: 14px;
      align-items: center;
      padding: 12px;
      border-radius: 20px;
      border: 1px solid rgba(148, 163, 184, 0.16);
      background: rgba(15, 23, 42, 0.78);
    }

    .track-selector-row.is-current {
      border-color: rgba(248, 212, 76, 0.72);
      box-shadow: 0 0 0 1px rgba(248, 212, 76, 0.22);
    }

    .track-selector-row-preview {
      width: 72px;
      height: 72px;
      overflow: hidden;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(34, 197, 94, 0.18), rgba(8, 47, 73, 0.82));
      flex-shrink: 0;
    }

    .track-selector-row-preview img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
    }

    .track-selector-row-body {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .track-selector-row-title {
      margin: 0;
      color: #f8fafc;
      font-size: 17px;
      line-height: 1.1;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track-selector-row-meta {
      margin: 0;
      color: #cbd5e1;
      font-size: 12px;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .track-selector-row-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      justify-content: flex-end;
    }

    .track-selector-button {
      min-height: 38px;
      padding: 0 14px;
      border: 1px solid rgba(148, 163, 184, 0.24);
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.04);
      color: #f8fafc;
      font: inherit;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
    }

    .track-selector-button:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.1);
    }

    .track-selector-button.is-brand {
      background: linear-gradient(135deg, #f8d44c 0%, #f97316 100%);
      border-color: rgba(249, 115, 22, 0.88);
      color: #111827;
    }

    .track-selector-button.is-close {
      width: 38px;
      min-width: 38px;
      padding: 0;
      font-size: 13px;
    }

    .track-selector-button:disabled {
      opacity: 0.42;
      cursor: wait;
    }

    .track-selector-status {
      padding: 20px 8px 4px;
      color: #cbd5e1;
      font-size: 13px;
      text-align: center;
    }

    .track-selector-status[hidden] {
      display: none;
    }

    @media (max-width: 900px) {
      .track-selector-row {
        grid-template-columns: 64px minmax(0, 1fr) auto;
        gap: 12px;
      }

      .track-selector-row-preview {
        width: 64px;
        height: 64px;
        border-radius: 16px;
      }

      .track-selector-button,
      .track-selector-tab {
        padding: 0 12px;
      }
    }

    @media (max-width: 720px) {
      .track-selector-launcher-rail {
        top: 14px;
        right: 14px;
      }

      .track-selector-overlay {
        padding: 12px;
      }

      .track-selector-header {
        padding: 16px 16px 12px;
      }

      .track-selector-tabs {
        padding: 12px 16px 14px;
        align-items: flex-start;
        gap: 12px;
      }

      .track-selector-tab-list {
        flex: 1;
        overflow-x: auto;
        padding-bottom: 2px;
      }

      .track-selector-scroll {
        padding: 14px 16px 16px;
      }

      .track-selector-row {
        grid-template-columns: 56px minmax(0, 1fr);
      }

      .track-selector-row-preview {
        width: 56px;
        height: 56px;
        border-radius: 14px;
      }

      .track-selector-row-actions {
        grid-column: 1 / -1;
        justify-content: flex-start;
      }
    }
  `;
  document.head.appendChild(style);
}

function resolveInitialTab(track: LoadedTrackState): TrackListTab {
  if (track.source === 'draft' || track.source === 'owned_asset') {
    return 'you';
  }
  const creatorUsername = parseAssetRefCreatorUsername(track.assetRef);
  if (creatorUsername === OFFICIAL_CREATOR_USERNAME) {
    return 'official';
  }
  if (creatorUsername) {
    return 'community';
  }
  return 'official';
}

export function installTrackSelector(
  sdk: PlaydropSDK,
  repository: TrackRepository,
  initialTrack: LoadedTrackState,
  options: {
    onSelectRequested: (target: TrackSelectorTarget) => Promise<LoadedTrackState>;
    onCreateRequested: () => void;
    onRemixRequested: (target: TrackSelectorTarget) => Promise<void> | void;
    onEditRequested: (target: TrackSelectorTarget) => Promise<void> | void;
  },
) {
  applyTrackSelectorStyles();
  document.querySelector('.track-selector-launcher-rail')?.remove();
  document.querySelector('.track-selector-launcher')?.remove();
  document.querySelector('.track-selector-overlay')?.remove();

  const launcherRail = document.createElement('div');
  launcherRail.className = 'track-selector-launcher-rail';

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'track-selector-launcher';
  applyLauncherIcon(launcher, ROUTE_ICON, 'Tracks');
  launcherRail.appendChild(launcher);

  const overlay = document.createElement('div');
  overlay.className = 'track-selector-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('section');
  dialog.className = 'track-selector-dialog';
  dialog.addEventListener('click', (event) => event.stopPropagation());

  const header = document.createElement('div');
  header.className = 'track-selector-header';
  const title = document.createElement('h2');
  title.textContent = 'Choose Track';

  const actions = document.createElement('div');
  actions.className = 'track-selector-header-actions';

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'track-selector-button is-brand';
  createButton.textContent = 'Create';
  createButton.addEventListener('click', () => {
    overlay.hidden = true;
    options.onCreateRequested();
  });

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'track-selector-button is-close';
  closeButton.setAttribute('aria-label', 'Close track selector');
  closeButton.textContent = 'X';
  closeButton.addEventListener('click', () => {
    overlay.hidden = true;
  });

  actions.append(closeButton);
  header.append(title, actions);

  const tabs = document.createElement('div');
  tabs.className = 'track-selector-tabs';

  const tabList = document.createElement('div');
  tabList.className = 'track-selector-tab-list';

  const tabButtons = new Map<TrackListTab, HTMLButtonElement>();
  for (const tab of ['official', 'you', 'community'] as const) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'track-selector-tab';
    button.textContent = TAB_LABELS[tab];
    button.addEventListener('click', () => {
      activeTab = tab;
      render();
    });
    tabButtons.set(tab, button);
    tabList.appendChild(button);
  }
  tabs.append(tabList, createButton);

  const scroll = document.createElement('div');
  scroll.className = 'track-selector-scroll';

  const list = document.createElement('div');
  list.className = 'track-selector-list';

  const status = document.createElement('div');
  status.className = 'track-selector-status';
  status.hidden = true;

  scroll.append(list, status);
  dialog.append(header, tabs, scroll);
  overlay.appendChild(dialog);
  overlay.addEventListener('click', () => {
    overlay.hidden = true;
  });

  document.body.append(launcherRail, overlay);

  let currentTrack = initialTrack;
  let activeTab = resolveInitialTab(initialTrack);
  let pendingActionKey: string | null = null;
  let launcherVisible = true;
  let loadGeneration = 0;

  const stateByTab: Record<TrackListTab, TrackListState> = {
    official: { items: [], loading: false, error: null },
    you: { items: [], loading: false, error: null },
    community: { items: [], loading: false, error: null },
  };

  const loadAllPublicTrackCards = async (
    sort: 'recent' | 'likes' | 'remixes' | 'comments',
    creatorUsername?: string,
  ): Promise<PublicTrackCard[]> => {
    const items: PublicTrackCard[] = [];
    let offset = 0;
    for (let page = 0; page < FETCH_MAX_PAGES; page += 1) {
      const response = creatorUsername
        ? await repository.listPublishedTracksForCreator(creatorUsername, {
            limit: FETCH_PAGE_SIZE,
            offset,
            sort,
          })
        : await repository.listPublishedTracks({
            limit: FETCH_PAGE_SIZE,
            offset,
            sort,
          });
      const typedResponse = response as PublicTrackListResponse;
      items.push(...mapPublicTrackCards(typedResponse));
      const count = typedResponse.assets.length;
      if (count === 0 || !typedResponse.pagination?.hasMore) {
        break;
      }
      offset += count;
    }
    return items;
  };

  const loadOwnedTrackCards = async (): Promise<OwnedTrackCard[]> => {
    if (!sdk.me.isLoggedIn) {
      return [];
    }
    const ownedTracks = await repository.listOwnedTracks() as OwnedTrackSummary[];
    return mapOwnedTrackCards(ownedTracks);
  };

  const refreshTracks = async () => {
    const generation = ++loadGeneration;
    for (const tab of ['official', 'you', 'community'] as const) {
      stateByTab[tab].loading = true;
      stateByTab[tab].error = null;
    }
    render();

    const currentUsername = normalizeUsername(sdk.me.username);
    const results = await Promise.allSettled([
      loadAllPublicTrackCards('recent', OFFICIAL_CREATOR_USERNAME),
      loadOwnedTrackCards(),
      loadAllPublicTrackCards('likes'),
    ]);

    if (generation !== loadGeneration) {
      return;
    }

    const [officialResult, ownedResult, communityResult] = results;

    stateByTab.official.loading = false;
    if (officialResult.status === 'fulfilled') {
      stateByTab.official.items = sortOfficialTracks(officialResult.value);
    } else {
      stateByTab.official.error = officialResult.reason instanceof Error
        ? officialResult.reason.message
        : 'official_tracks_load_failed';
      console.error('[starter-kit-racing] failed to load official tracks', officialResult.reason);
    }

    stateByTab.you.loading = false;
    if (ownedResult.status === 'fulfilled') {
      stateByTab.you.items = sortOwnedTracks(ownedResult.value);
    } else {
      stateByTab.you.error = ownedResult.reason instanceof Error
        ? ownedResult.reason.message
        : 'owned_tracks_load_failed';
      console.error('[starter-kit-racing] failed to load owned tracks', ownedResult.reason);
    }

    stateByTab.community.loading = false;
    if (communityResult.status === 'fulfilled') {
      const filtered = communityResult.value.filter((item) => {
        const creatorUsername = normalizeUsername(item.creatorUsername);
        if (creatorUsername === OFFICIAL_CREATOR_USERNAME) {
          return false;
        }
        if (currentUsername && creatorUsername === currentUsername) {
          return false;
        }
        return true;
      });
      stateByTab.community.items = sortCommunityTracks(filtered);
    } else {
      stateByTab.community.error = communityResult.reason instanceof Error
        ? communityResult.reason.message
        : 'community_tracks_load_failed';
      console.error('[starter-kit-racing] failed to load community tracks', communityResult.reason);
    }

    render();
  };

  const reportTrackActionFailure = (error: unknown) => {
    const state = stateByTab[activeTab];
    state.error = error instanceof Error ? error.message : 'track_action_failed';
    console.error('[starter-kit-racing] track selector action failed', error);
  };

  const isCurrentTrackItem = (item: TrackListItem) => currentTrack.assetRef === item.assetRef;

  const render = () => {
    launcher.hidden = !launcherVisible;
    if (!launcherVisible) {
      overlay.hidden = true;
    }

    for (const tab of ['official', 'you', 'community'] as const) {
      const button = tabButtons.get(tab);
      if (!button) {
        continue;
      }
      button.classList.toggle('is-active', tab === activeTab);
      button.setAttribute('aria-pressed', tab === activeTab ? 'true' : 'false');
    }

    list.innerHTML = '';

    const activeState = stateByTab[activeTab];
    for (const item of activeState.items) {
      const row = document.createElement('article');
      row.className = 'track-selector-row';

      const current = isCurrentTrackItem(item);
      if (current) {
        row.classList.add('is-current');
      }

      const preview = document.createElement('div');
      preview.className = 'track-selector-row-preview';
      if (item.previewUrl) {
        const image = document.createElement('img');
        image.src = item.previewUrl;
        image.alt = `${item.displayName} preview`;
        preview.appendChild(image);
      }

      const body = document.createElement('div');
      body.className = 'track-selector-row-body';

      const itemTitle = document.createElement('h3');
      itemTitle.className = 'track-selector-row-title';
      itemTitle.textContent = item.displayName;

      const meta = document.createElement('p');
      meta.className = 'track-selector-row-meta';
      meta.textContent = formatTrackMeta(item);

      body.append(itemTitle, meta);

      const rowActions = document.createElement('div');
      rowActions.className = 'track-selector-row-actions';

      const selectButton = document.createElement('button');
      selectButton.type = 'button';
      selectButton.className = 'track-selector-button is-brand';
      selectButton.textContent = current ? 'Selected' : 'Select';
      selectButton.disabled = Boolean(pendingActionKey) || current;
      selectButton.addEventListener('click', () => {
        void (async () => {
          if (pendingActionKey) {
            return;
          }
          pendingActionKey = `select:${item.kind}:${item.assetRef}`;
          render();
          try {
            currentTrack = await options.onSelectRequested({
              kind: item.kind,
              assetRef: item.assetRef,
            });
            overlay.hidden = true;
          } catch (error) {
            reportTrackActionFailure(error);
          } finally {
            pendingActionKey = null;
            render();
          }
        })();
      });

      const remixButton = document.createElement('button');
      remixButton.type = 'button';
      remixButton.className = 'track-selector-button';
      const usesEditAction = activeTab === 'you' && item.kind === 'owned';
      remixButton.textContent = usesEditAction ? 'Edit' : 'Remix';
      remixButton.disabled = Boolean(pendingActionKey);
      remixButton.addEventListener('click', () => {
        void (async () => {
          if (pendingActionKey) {
            return;
          }
          pendingActionKey = `${usesEditAction ? 'edit' : 'remix'}:${item.kind}:${item.assetRef}`;
          render();
          try {
            const target = {
              kind: item.kind,
              assetRef: item.assetRef,
            } as const;
            if (usesEditAction) {
              await options.onEditRequested(target);
            } else {
              await options.onRemixRequested(target);
            }
            overlay.hidden = true;
          } catch (error) {
            reportTrackActionFailure(error);
          } finally {
            pendingActionKey = null;
            render();
          }
        })();
      });

      const detailButton = document.createElement('button');
      detailButton.type = 'button';
      detailButton.className = 'track-selector-button';
      detailButton.textContent = 'Detail';
      detailButton.disabled = Boolean(pendingActionKey);
      detailButton.addEventListener('click', () => {
        window.open(repository.buildAssetDetailUrl(item.creatorUsername, item.assetName), '_blank', 'noopener');
      });

      rowActions.append(selectButton, remixButton, detailButton);
      row.append(preview, body, rowActions);
      list.appendChild(row);
    }

    status.hidden = true;
    status.textContent = '';
    if (activeState.items.length === 0 && activeState.loading) {
      status.hidden = false;
      status.textContent = 'Loading...';
    } else if (activeState.items.length === 0 && activeState.error) {
      status.hidden = false;
      status.textContent = 'Unable to load tracks.';
    }

  };

  const open = ({ tab, refresh = true }: { tab?: TrackListTab; refresh?: boolean } = {}) => {
    activeTab = tab ?? resolveInitialTab(currentTrack);
    overlay.hidden = false;
    render();
    if (refresh) {
      void refreshTracks();
    }
  };

  launcher.addEventListener('click', () => {
    open();
  });

  render();

  return {
    close() {
      overlay.hidden = true;
    },
    open,
    setCurrentTrack(track: LoadedTrackState) {
      currentTrack = track;
      render();
    },
    setLauncherVisible(visible: boolean) {
      launcherVisible = visible;
      if (!visible) {
        overlay.hidden = true;
      }
      render();
    },
    getLauncherRail() {
      return launcherRail;
    },
  };
}
