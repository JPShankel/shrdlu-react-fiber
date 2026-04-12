import React from 'react';
import { WorldObject } from './types.ts';

const sizeScaleMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
  jumbo: 2.1,
};
const boxInteriorSizeMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
  jumbo: 3.1,
};
const boxInteriorHeightMap = {
  small: 0.7,
  medium: 1,
  large: 1.4,
  jumbo: 1.4,
};
const boxWallThicknessMap = {
  small: 0.1,
  medium: 0.12,
  large: 0.16,
  jumbo: 0.2,
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

const Box: React.FC<{ object: WorldObject }> = ({ object }) => {
  const innerWidth = boxInteriorSizeMap[object.size];
  const innerDepth = boxInteriorSizeMap[object.size];
  const innerHeight = boxInteriorHeightMap[object.size];
  const wallThickness = boxWallThicknessMap[object.size];
  const outerWidth = innerWidth + wallThickness * 2;
  const outerDepth = innerDepth + wallThickness * 2;
  const outerHeight = innerHeight + wallThickness;
  const floorOffsetY = -(outerHeight / 2 - wallThickness / 2);
  const floorTopY = floorOffsetY + wallThickness / 2;
  const wallCenterY = floorTopY + innerHeight / 2;
  const sideOffsetX = outerWidth / 2 - wallThickness / 2;
  const sideOffsetZ = outerDepth / 2 - wallThickness / 2;

  return (
    <group position={object.position}>
      {object.isHeld ? <pointLight color="#fff3a3" intensity={2.5} distance={3} /> : null}
      <mesh castShadow receiveShadow position={[0, floorOffsetY, 0]}>
        <boxGeometry args={[outerWidth, wallThickness, outerDepth]} />
        <meshStandardMaterial
          color={object.color}
          emissive={object.isHeld ? '#ffef88' : '#000000'}
          emissiveIntensity={object.isHeld ? 0.65 : 0}
        />
      </mesh>
      <mesh castShadow receiveShadow position={[-sideOffsetX, wallCenterY, 0]}>
        <boxGeometry args={[wallThickness, innerHeight, outerDepth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[sideOffsetX, wallCenterY, 0]}>
        <boxGeometry args={[wallThickness, innerHeight, outerDepth]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, wallCenterY, -sideOffsetZ]}>
        <boxGeometry args={[innerWidth, innerHeight, wallThickness]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, wallCenterY, sideOffsetZ]}>
        <boxGeometry args={[innerWidth, innerHeight, wallThickness]} />
        <meshStandardMaterial color={object.color} />
      </mesh>
    </group>
  );
};

export const ShapeRenderer: React.FC<{ object: WorldObject }> = ({ object }) => {
  switch (object.type) {
    case 'cube':
      return <Cube object={object} />;
    case 'sphere':
      return <Sphere object={object} />;
    case 'cone':
      return <Cone object={object} />;
    case 'box':
      return <Box object={object} />;
    default:
      return null;
  }
};
