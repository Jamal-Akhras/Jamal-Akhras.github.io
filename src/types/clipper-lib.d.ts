// Minimal type shim for clipper-lib (Angus Johnson's Clipper 6 JS port, no types shipped).
// Only the surface we use for polygon offsetting is declared.
declare module 'clipper-lib' {
  export interface IntPoint {
    X: number;
    Y: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];

  interface ClipperOffsetInstance {
    AddPath(path: Path, joinType: number, endType: number): void;
    AddPaths(paths: Paths, joinType: number, endType: number): void;
    Execute(solution: Paths, delta: number): void;
    Clear(): void;
  }

  interface ClipperOffsetCtor {
    new (miterLimit?: number, arcTolerance?: number): ClipperOffsetInstance;
  }

  interface ClipperLibStatic {
    ClipperOffset: ClipperOffsetCtor;
    JoinType: { jtSquare: number; jtRound: number; jtMiter: number };
    EndType: {
      etOpenSquare: number;
      etOpenRound: number;
      etOpenButt: number;
      etClosedLine: number;
      etClosedPolygon: number;
    };
  }

  const ClipperLib: ClipperLibStatic;
  export default ClipperLib;
}
