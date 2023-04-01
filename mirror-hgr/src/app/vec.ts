import { Vector2D } from '@tensorflow-models/pose-detection/dist/posenet/types';

export class Vec2D {
  constructor(public x: number, public y: number) {}

  public plus(other: Vec2D) {
    return new Vec2D(this.x + other.x, this.y + other.y);
  }

  public minus(other: Vec2D) {
    return new Vec2D(this.x - other.x, this.y - other.y);
  }

  public scale(scale: number) {
    return new Vec2D(this.x * scale, this.y * scale);
  }

  public get magnitude() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  public distance(other: Vec2D) {
    return this.minus(other).magnitude;
  }

  public dot(other: Vec2D) {
    return this.x * other.x + this.y * other.y;
  }
}

export class Vec3D {
  constructor(public x: number, public y: number, public z: number) {}

  public cross(other: Vec3D) {
    return new Vec3D(
      this.y * other.z - this.z * other.y,
      this.z * other.x - this.x * other.z,
      this.x * other.y - this.y * other.x
    );
  }

  public dot(other: Vec3D) {
    return this.x * other.x + this.y * other.y + this.z * other.z;
  }

  public static from2D(vec2d: Vec2D, z: number = 0) {
    return new Vec3D(vec2d.x, vec2d.y, z);
  }
}

export class Box {
  constructor(public min: Vec2D, public max: Vec2D) {}
}
