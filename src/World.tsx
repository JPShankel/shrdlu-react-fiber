import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, ContactShadows } from '@react-three/drei';

/**
 * World Component
 * 
 * This component initializes the Three.js scene. It provides the ground grid 
 * reference system and the lighting environment required for rendering 
 * primitive objects.
 */
const World: React.FC = () => {
  return (
    <div id="shrdlu-world-container" style={{ width: '100%', height: '100vh', background: '#e0e0e0' }}>
      <Canvas 
        shadows 
        camera={{ position: [10, 10, 10], fov: 35 }}
        dpr={[1, 2]} // Performance optimization for high-density screens
      >
        <Suspense fallback={null}>
          {/* Stage Environment */}
          <color attach="background" args={['#fdfdfd']} />
          <ambientLight intensity={0.5} />
          <directionalLight 
            position={[5, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
          />

          {/* Ground Grid Implementation */}
          <Grid
            position={[0, -0.01, 0]}
            args={[20, 20]}
            cellSize={1}
            cellColor="#6f6f6f"
            sectionSize={5}
            sectionColor="#9d4b4b"
            fadeDistance={300}
            infiniteGrid
          />

          <ContactShadows position={[0, 0, 0]} opacity={0.25} scale={20} blur={2} far={4.5} />
          <OrbitControls makeDefault minPolarAngle={0} maxPolarAngle={Math.PI / 2.1} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default World;