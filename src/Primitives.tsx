import React from 'react';
import { WorldObject } from '../types';

const Box: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

const Sphere: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <sphereGeometry args={[0.6, 32, 32]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

const Cylinder: React.FC<{ object: WorldObject }> = ({ object }) => (
  <mesh position={object.position} castShadow receiveShadow>
    <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
    <meshStandardMaterial color={object.color} />
  </mesh>
);

export const ShapeRenderer: React.FC<{ object: WorldObject }> = ({ object }) => {
  switch (object.type) {
    case 'box': return <Box object={object} />;
    case 'sphere': return <Sphere object={object} />;
    case 'cylinder': return <Cylinder object={object} />;
    default: return null;
  }
};