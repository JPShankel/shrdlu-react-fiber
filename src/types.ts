export type ObjectShape = 'cube' | 'sphere' | 'cone' | 'box';
export type ObjectSize = 'small' | 'medium' | 'large' | 'jumbo';
export type ObjectColor = 'red' | 'yellow' | 'orange' | 'green' | 'blue';

export interface WorldObject {
  id: string;
  type: ObjectShape;
  size: ObjectSize;
  color: ObjectColor;
  position: [number, number, number];
  basePosition: [number, number, number];
  isHeld: boolean;
  containerId?: string | null;
}
