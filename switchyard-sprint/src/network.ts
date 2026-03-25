import * as THREE from "three";

import type { DestinationId, SwitchStates } from "./game-logic";

export const BOARD_WIDTH = 30;
export const BOARD_DEPTH = 20;

export type SegmentId =
  | "entry"
  | "upperBranch"
  | "lowerBranch"
  | "upperTop"
  | "upperMiddle"
  | "lowerMiddle"
  | "lowerBottom";

export interface SegmentDefinition {
  id: SegmentId;
  curve: THREE.CatmullRomCurve3;
  length: number;
  destination?: DestinationId;
}

export interface RailNetwork {
  segments: Record<SegmentId, SegmentDefinition>;
  junctionPositions: Record<"branch" | "upper" | "lower", THREE.Vector3>;
  depotAnchors: Record<DestinationId, THREE.Vector3>;
}

export function createRailNetwork(): RailNetwork {
  const entry = makeCurve([
    [-14.4, 0],
    [-11.6, 0],
    [-8.4, 0],
    [-5.8, 0],
  ]);

  const upperBranch = makeCurve([
    [-5.8, 0],
    [-4.7, -0.4],
    [-2.7, -2.1],
    [1.9, -3.3],
  ]);

  const lowerBranch = makeCurve([
    [-5.8, 0],
    [-4.7, 0.4],
    [-2.7, 2.1],
    [1.9, 3.3],
  ]);

  const upperTop = makeCurve([
    [1.9, -3.3],
    [4.3, -4.1],
    [7.6, -5.3],
    [10.9, -6.1],
  ]);

  const upperMiddle = makeCurve([
    [1.9, -3.3],
    [4.7, -2.6],
    [8.2, -1.6],
    [11.6, -0.8],
  ]);

  const lowerMiddle = makeCurve([
    [1.9, 3.3],
    [4.7, 2.6],
    [8.2, 1.6],
    [11.6, 0.8],
  ]);

  const lowerBottom = makeCurve([
    [1.9, 3.3],
    [4.3, 4.1],
    [7.6, 5.3],
    [10.9, 6.1],
  ]);

  return {
    segments: {
      entry: createSegment("entry", entry),
      upperBranch: createSegment("upperBranch", upperBranch),
      lowerBranch: createSegment("lowerBranch", lowerBranch),
      upperTop: createSegment("upperTop", upperTop, "top"),
      upperMiddle: createSegment("upperMiddle", upperMiddle, "middle"),
      lowerMiddle: createSegment("lowerMiddle", lowerMiddle, "middle"),
      lowerBottom: createSegment("lowerBottom", lowerBottom, "bottom"),
    },
    junctionPositions: {
      branch: new THREE.Vector3(-5.8, 0.5, 0),
      upper: new THREE.Vector3(1.9, 0.5, -3.3),
      lower: new THREE.Vector3(1.9, 0.5, 3.3),
    },
    depotAnchors: {
      top: new THREE.Vector3(12.7, 0.5, -6.1),
      middle: new THREE.Vector3(13.1, 0.5, 0),
      bottom: new THREE.Vector3(12.7, 0.5, 6.1),
    },
  };
}

export function getNextSegmentId(segmentId: SegmentId, switches: SwitchStates): SegmentId | null {
  switch (segmentId) {
    case "entry":
      return switches.branch === "upper" ? "upperBranch" : "lowerBranch";
    case "upperBranch":
      return switches.upper === "top" ? "upperTop" : "upperMiddle";
    case "lowerBranch":
      return switches.lower === "middle" ? "lowerMiddle" : "lowerBottom";
    default:
      return null;
  }
}

function makeCurve(points: Array<[number, number]>): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    points.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    "centripetal",
    0.3,
  );
}

function createSegment(
  id: SegmentId,
  curve: THREE.CatmullRomCurve3,
  destination?: DestinationId,
): SegmentDefinition {
  const segment: SegmentDefinition = {
    id,
    curve,
    length: curve.getLength(),
  };

  if (destination) {
    segment.destination = destination;
  }

  return segment;
}
