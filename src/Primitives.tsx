import React from 'react';
import { WorldObject } from './types.ts';

const sizeScaleMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
};

const Cube: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <boxGeometry args={[sizeScaleMap[object.size], sizeScaleMap[object.size], sizeScaleMap[object.size]]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

const Sphere: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <sphereGeometry args={[0.45 * sizeScaleMap[object.size], 32, 32]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

const Cone: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <coneGeometry args={[0.45 * sizeScaleMap[object.size], sizeScaleMap[object.size], 32]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

export const ShapeRenderer: React.FC<{ object: WorldObject }> = ({ object }) => {
  switch (object.type) {
    case 'cube':
      return <Cube object={object} />;
    case 'sphere':
      return <Sphere object={object} />;
    case 'cone':
      return <Cone object={object} />;
    default:
      return null;
  }
};
