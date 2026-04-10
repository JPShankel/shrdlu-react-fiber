# SHRDLU 3D Development Plan

This document outlines the transition of the SHRDLU project into a 3D environment with Natural Language Understanding (NLU) capabilities.

## 1. Core Architecture
- **Renderer**: React Three Fiber (R3F) for declarative 3D scene management.
- **State Management**: React `useState` (expandable to Zustand) for tracking object positions, types, and colors.
- **Validation**: TypeBox for runtime schema validation of the world state.

## 2. Implemented Components
### 3D Infrastructure (`World.tsx`)
- **Canvas**: Main 3D viewport.
- **Grid**: Coordinate-aware ground plane for spatial reference.
- **Lighting**: Ambient and directional lights with shadow support.
- **Controls**: OrbitControls for scene navigation.

### Primitive Library (`Primitives.tsx`)
- Support for `Box`, `Sphere`, and `Cylinder`.
- Dynamic material coloring based on state.
- Shadow casting and receiving.

### NLU Console (`Console.tsx`)
- Fixed-bottom overlay for command input.
- Scrollable log history for system feedback.
- Natural language input field.

## 3. Roadmap
### Phase 1: Basic Interaction (Completed)
- Setup 3D stage and grid.
- Define data schemas for primitives.
- Implement the command console UI.

### Phase 2: The "Brain" (In Progress)
- **Command Parsing**: Enhance `handleCommand` in `App.js` to extract intent, color, shape, and coordinates.
- **Spatial Reasoning**: Logic to prevent object overlap and handle stacking (Y-axis calculations).
- **Feedback Loop**: Providing detailed "OK" or "Error" messages back to the user via the console.

### Phase 3: Physics & Refinement
- Integration of `@react-three/cannon` for realistic gravity and collisions.
- Advanced NLU (handling relative references like "the block behind the red cube").
- Accessibility enhancements using `axe-core`.

## 4. Environment Notes
- `GENERATE_SOURCEMAP=false` is set in `.env` to suppress third-party dependency warnings.