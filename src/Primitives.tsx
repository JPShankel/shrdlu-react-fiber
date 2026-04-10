import React from 'react';
import { WorldObject } from './types.ts';

const sizeScaleMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
};

const Cube: React.FC<{ object: WorldObject }> = ({ object }) => (
  <group position={object.position}>
    {object.isHeld ? <pointLight color="#fff3a3" intensity={2.5} distance={3} /> : null}
    <mesh castShadow receiveShadow>
      <boxGeometry args={[sizeScaleMap[object.size], sizeScaleMap[object.size], sizeScaleMap[object.size]]} />
      <meshStandardMaterial
        color={object.color}
        emissive={object.isHeld ? '#ffef88' : '#000000'}
        emissiveIntensity={object.isHeld ? 0.85 : 0}
      />
    </mesh>
  </group>
);

const Sphere: React.FC<{ object: WorldObject }> = ({ object }) => (
  <group position={object.position}>
    {object.isHeld ? <pointLight color="#fff3a3" intensity={2.5} distance={3} /> : null}
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[0.45 * sizeScaleMap[object.size], 32, 32]} />
      <meshStandardMaterial
        color={object.color}
        emissive={object.isHeld ? '#ffef88' : '#000000'}
        emissiveIntensity={object.isHeld ? 0.85 : 0}
      />
    </mesh>
  </group>
);

const Cone: React.FC<{ object: WorldObject }> = ({ object }) => (
  <group position={object.position}>
    {object.isHeld ? <pointLight color="#fff3a3" intensity={2.5} distance={3} /> : null}
    <mesh castShadow receiveShadow>
      <coneGeometry args={[0.45 * sizeScaleMap[object.size], sizeScaleMap[object.size], 32]} />
      <meshStandardMaterial
        color={object.color}
        emissive={object.isHeld ? '#ffef88' : '#000000'}
        emissiveIntensity={object.isHeld ? 0.85 : 0}
      />
    </mesh>
  </group>
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
