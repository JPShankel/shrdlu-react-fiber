export type ObjectShape = 'cube' | 'sphere' | 'cone';
export type ObjectSize = 'small' | 'medium' | 'large';
export type ObjectColor = 'red' | 'yellow' | 'orange' | 'green' | 'blue';

export interface WorldObject {
  id: string;
  type: ObjectShape;
  size: ObjectSize;
  color: ObjectColor;
  position: [number, number, number];
  basePosition: [number, number, number];
  isHeld: boolean;
}
