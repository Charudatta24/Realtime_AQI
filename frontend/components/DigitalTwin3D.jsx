'use client';

import { useRef, useMemo, useState, useEffect, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Stars, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { getAqiColor } from '../utils/aqi';

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────
const hexToRgb = (hex) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
};

// ──────────────────────────────────────────────────────────────────────────────
// AQI Grid Terrain  (10×10 coloured flat tiles)
// ──────────────────────────────────────────────────────────────────────────────
function AqiGrid({ gridAqi, onCellClick, selectedCell }) {
  const ROWS = 10, COLS = 10, SIZE = 2.0, GAP = 0.08;
  const step = SIZE + GAP;

  return (
    <group>
      {gridAqi && gridAqi.map((row, ri) =>
        row.map((aqi, ci) => {
          const hex   = getAqiColor(aqi);
          const [r, g, b] = hexToRgb(hex);
          const isSelected = selectedCell && selectedCell.row === ri && selectedCell.col === ci;
          const x = (ci - COLS / 2 + 0.5) * step;
          const z = (ri - ROWS / 2 + 0.5) * step;
          const height = Math.max(0.05, (aqi / 500) * 1.2);  // slight elevation by AQI

          return (
            <mesh
              key={`${ri}-${ci}`}
              position={[x, height / 2, z]}
              onClick={() => onCellClick({ row: ri, col: ci, aqi })}
            >
              <boxGeometry args={[SIZE, height, SIZE]} />
              <meshStandardMaterial
                color={new THREE.Color(r, g, b)}
                emissive={new THREE.Color(r * 0.3, g * 0.3, b * 0.3)}
                roughness={0.6}
                metalness={0.05}
                transparent
                opacity={isSelected ? 1.0 : 0.75}
              />
            </mesh>
          );
        })
      )}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Industry Stack (tall cylinder with animated smoke particles)
// ──────────────────────────────────────────────────────────────────────────────
function IndustryStack({ position, emission }) {
  const smokeRef = useRef();
  const particleCount = 60;

  const positions = useMemo(() => {
    const arr = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 0.4;
      arr[i * 3 + 1] = Math.random() * 6;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!smokeRef.current) return;
    const t = clock.getElapsedTime();
    const pos = smokeRef.current.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      pos.array[i * 3 + 1] = ((pos.array[i * 3 + 1] + 0.015) % 6);
      pos.array[i * 3]     += Math.sin(t + i) * 0.003;
    }
    pos.needsUpdate = true;
  });

  const stackH = 3 + (emission / 100);

  return (
    <group position={position}>
      {/* Stack body */}
      <mesh position={[0, stackH / 2, 0]}>
        <cylinderGeometry args={[0.2, 0.35, stackH, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Smoke particles */}
      <points ref={smokeRef} position={[0, stackH, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={particleCount} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#9ca3af" size={0.25} transparent opacity={0.45} sizeAttenuation />
      </points>
      {/* Label */}
      <Text position={[0, stackH + 1, 0]} fontSize={0.35} color="#f97316" anchorX="center">
        🏭 Stack
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Construction Site (animated dust + crane-like structure)
// ──────────────────────────────────────────────────────────────────────────────
function ConstructionSite({ position, strength }) {
  const dustRef = useRef();
  const count = 40;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 2;
      arr[i * 3 + 1] = Math.random() * 2;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!dustRef.current) return;
    const pos = dustRef.current.geometry.attributes.position;
    for (let i = 0; i < count; i++) {
      pos.array[i * 3 + 1] += 0.008;
      if (pos.array[i * 3 + 1] > 3) pos.array[i * 3 + 1] = 0;
    }
    pos.needsUpdate = true;
  });

  return (
    <group position={position}>
      {/* Ground scaffold */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.5, 1, 1.5]} />
        <meshStandardMaterial color="#f97316" wireframe />
      </mesh>
      {/* Vertical mast */}
      <mesh position={[0.6, 2, 0]}>
        <boxGeometry args={[0.1, 3, 0.1]} />
        <meshStandardMaterial color="#78716c" />
      </mesh>
      {/* Dust particles */}
      <points ref={dustRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial color="#d97706" size={0.2} transparent opacity={0.5} sizeAttenuation />
      </points>
      <Text position={[0, 4, 0]} fontSize={0.3} color="#fb923c" anchorX="center">
        🏗️ Site
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Satellite Fire / Biomass Burning marker (pulsing red sphere)
// ──────────────────────────────────────────────────────────────────────────────
function FireMarker({ position, frp }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.scale.setScalar(1 + 0.15 * Math.sin(clock.getElapsedTime() * 3));
    }
  });
  return (
    <group position={position}>
      <mesh ref={ref}>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.5} transparent opacity={0.85} />
      </mesh>
      <Text position={[0, 1.5, 0]} fontSize={0.35} color="#fca5a5" anchorX="center">
        🔥 {frp.toFixed(0)} MW
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// CAAQMS Monitoring Station
// ──────────────────────────────────────────────────────────────────────────────
function StationMarker({ position, station }) {
  const color = getAqiColor(station.aqi);
  const [r, g, b] = hexToRgb(color);
  return (
    <group position={position}>
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 2, 8]} />
        <meshStandardMaterial color="#71717a" />
      </mesh>
      <mesh position={[0, 2.1, 0]}>
        <sphereGeometry args={[0.4, 12, 12]} />
        <meshStandardMaterial color={new THREE.Color(r, g, b)} emissive={new THREE.Color(r * 0.5, g * 0.5, b * 0.5)} emissiveIntensity={1} />
      </mesh>
      <Text position={[0, 3.2, 0]} fontSize={0.28} color={color} anchorX="center" maxWidth={4}>
        {station.name.split(' ').slice(-2).join(' ')} — AQI {station.aqi}
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Wind Direction Arrow (animated drift)
// ──────────────────────────────────────────────────────────────────────────────
function WindArrow({ windDir, windSpeed }) {
  const arrowRef = useRef();
  const radians  = (windDir * Math.PI) / 180;
  useFrame(({ clock }) => {
    if (arrowRef.current) {
      arrowRef.current.rotation.y = -(radians + clock.getElapsedTime() * 0.05);
    }
  });

  return (
    <group position={[0, 9, 0]} ref={arrowRef}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.35, 1.3, 8]} />
        <meshStandardMaterial color="#10b981" emissive="#059669" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 2.4, 8]} />
        <meshStandardMaterial color="#10b981" />
      </mesh>
      <Text position={[0, 1.2, 0]} fontSize={0.4} color="#34d399" anchorX="center">
        Wind {windDir}° · {windSpeed} km/h
      </Text>
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Ground Plane with Grid Lines
// ──────────────────────────────────────────────────────────────────────────────
function GroundPlane() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#07070a" roughness={1} />
      </mesh>
      <gridHelper args={[30, 10, '#1f1f2e', '#0f0f15']} position={[0, 0, 0]} />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Traffic Visualiser — animated box cars and location beacons
// ──────────────────────────────────────────────────────────────────────────────
function TrafficVisualiser({ gridVehicles, gridLocationUsers, toWorld }) {
  const beaconRef = useRef();
  const vehiclesRef = useRef([]);

  // Pulse animation for location sharing beacons
  useFrame(({ clock }) => {
    if (beaconRef.current) {
      const scale = 1 + 0.25 * Math.sin(clock.getElapsedTime() * 4);
      beaconRef.current.scale.set(scale, scale, scale);
    }
    // Animate miniature vehicles along roads
    vehiclesRef.current.forEach((car, idx) => {
      if (car) {
        const t = clock.getElapsedTime() * 0.5 + idx;
        // Simple back-and-forth movement inside their grid cell
        car.position.x = car.userData.baseX + Math.sin(t) * 0.6;
        car.position.z = car.userData.baseZ + Math.cos(t) * 0.2;
      }
    });
  });

  // Collect cells with high vehicle counts or location users
  const { cars, beacons } = useMemo(() => {
    const carsList = [];
    const beaconsList = [];
    if (!gridVehicles) return { cars: [], beacons: [] };

    let carIdx = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const vCount = gridVehicles[r]?.[c] || 0;
        const uCount = gridLocationUsers[r]?.[c] || 0;
        const [wx, _, wz] = toWorld(r, c);

        // Render mini cars (boxes) if cell has substantial traffic
        if (vCount > 15) {
          const numCars = Math.min(3, Math.floor(vCount / 20));
          for (let i = 0; i < numCars; i++) {
            carsList.push({
              id: `car-${r}-${c}-${i}`,
              baseX: wx + (i - 0.5) * 0.4,
              baseZ: wz + (i - 0.5) * 0.4,
              y: 0.8,
              color: vCount > 60 ? '#ef4444' : vCount > 35 ? '#eab308' : '#3b82f6',
              idx: carIdx++
            });
          }
        }

        // Render location beacon if location users are active
        if (uCount > 2) {
          beaconsList.push({
            id: `beacon-${r}-${c}`,
            x: wx,
            y: 1.2,
            z: wz,
            count: uCount
          });
        }
      }
    }
    return { cars: carsList, beacons: beaconsList };
  }, [gridVehicles, gridLocationUsers, toWorld]);

  return (
    <group>
      {/* Animated mini cars */}
      {cars.map((car) => (
        <mesh
          key={car.id}
          ref={(el) => (vehiclesRef.current[car.idx] = el)}
          userData={{ baseX: car.baseX, baseZ: car.baseZ }}
          position={[car.baseX, car.y, car.baseZ]}
        >
          <boxGeometry args={[0.22, 0.12, 0.12]} />
          <meshStandardMaterial color={car.color} roughness={0.5} metalness={0.8} />
        </mesh>
      ))}

      {/* Pulse beacons for location sharing */}
      {beacons.map((b) => (
        <group key={b.id} position={[b.x, b.y, b.z]}>
          <mesh ref={beaconRef}>
            <ringGeometry args={[0.2, 0.28, 8]} />
            <meshBasicMaterial color="#10b981" side={THREE.DoubleSide} transparent opacity={0.65} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <sphereGeometry args={[0.06, 6, 6]} />
            <meshBasicMaterial color="#6ee7b7" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Pollution Plume Particle Spread (Gaussian dispersion simulation downwind)
// ──────────────────────────────────────────────────────────────────────────────
function PollutionPlume({ gridData, toWorld }) {
  const pointsRef = useRef();
  const particleCount = 200;

  const { sources, windAngle, windSpeed } = useMemo(() => {
    const list = [];
    if (!gridData) return { sources: [], windAngle: 0, windSpeed: 5 };

    const { industries, satellite_fires, highways, meteorology } = gridData;

    // Collect stack sources
    if (industries) {
      industries.forEach((ind) => list.push(toWorld(ind.row, ind.col)));
    }
    // Collect fire sources
    if (satellite_fires) {
      satellite_fires.forEach((fire) => list.push(toWorld(fire.row, fire.col)));
    }
    // Sample a few highway cells
    if (highways && highways.length > 0) {
      highways.slice(0, 3).forEach((h) => list.push(toWorld(h.row, h.col)));
    }

    const angle = meteorology?.wind_direction || 0;
    const speed = meteorology?.wind_speed || 5;
    return { sources: list, windAngle: angle, windSpeed: speed };
  }, [gridData, toWorld]);

  // Initialise particles randomly spread among emission sources
  const [positions, velocities, ages] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount * 3);
    const ags = new Float32Array(particleCount);

    if (sources.length === 0) return [pos, vel, ags];

    for (let i = 0; i < particleCount; i++) {
      const src = sources[Math.floor(Math.random() * sources.length)];
      pos[i * 3]     = src[0] + (Math.random() - 0.5) * 0.4;
      pos[i * 3 + 1] = 0.5 + Math.random() * 2.0;
      pos[i * 3 + 2] = src[2] + (Math.random() - 0.5) * 0.4;

      ags[i] = Math.random() * 100; // random age offset
    }

    return [pos, vel, ags];
  }, [sources]);

  useFrame(() => {
    if (!pointsRef.current || sources.length === 0) return;

    const posAttr = pointsRef.current.geometry.attributes.position;
    const rad = (windAngle * Math.PI) / 180;
    // Blowing downwind angle vector
    const dx = Math.cos(rad) * (windSpeed * 0.003);
    const dz = Math.sin(rad) * (windSpeed * 0.003);

    for (let i = 0; i < particleCount; i++) {
      ages[i] += 1.0;

      // Move particle downwind + rise slightly + crosswind turbulence
      posAttr.array[i * 3]     += dx + (Math.random() - 0.5) * 0.04;
      posAttr.array[i * 3 + 1] += 0.015;
      posAttr.array[i * 3 + 2] += dz + (Math.random() - 0.5) * 0.04;

      // Respawn particle if it ages out or drifts away from the scene limits
      const x = posAttr.array[i * 3];
      const z = posAttr.array[i * 3 + 2];
      if (ages[i] > 180 || Math.abs(x) > 15 || Math.abs(z) > 15) {
        const src = sources[Math.floor(Math.random() * sources.length)];
        posAttr.array[i * 3]     = src[0] + (Math.random() - 0.5) * 0.3;
        posAttr.array[i * 3 + 1] = 0.5;
        posAttr.array[i * 3 + 2] = src[2] + (Math.random() - 0.5) * 0.3;
        ages[i] = 0;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (sources.length === 0) return null;

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={particleCount} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color="#a855f7"
        size={0.16}
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main 3D Scene
// ──────────────────────────────────────────────────────────────────────────────
function CityScene({ gridData, selectedCell, onCellClick }) {
  if (!gridData) return null;

  const { grid_aqi, stations, satellite_fires, construction_sites, industries, highways, meteorology, grid_vehicles, grid_location_users } = gridData;

  const STEP = 2.08; // grid step
  const offset = (idx, total) => (idx - total / 2 + 0.5) * STEP;

  // Convert grid row,col to world position
  const toWorld = useCallback((row, col) => [offset(col, 10), 0, offset(row, 10)], [STEP]);

  return (
    <>
      <Stars radius={80} depth={50} count={3000} factor={3} saturation={0} fade speed={0.5} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[10, 20, 10]} intensity={0.9} castShadow />
      <pointLight position={[0, 15, 0]} intensity={0.6} color="#a78bfa" />

      <GroundPlane />

      {/* AQI Grid Terrain */}
      <AqiGrid gridAqi={grid_aqi} onCellClick={onCellClick} selectedCell={selectedCell} />

      {/* Industry Stacks */}
      {industries && industries.map((ind, i) => (
        <IndustryStack
          key={`ind-${i}`}
          position={[toWorld(ind.row, ind.col)[0], 0, toWorld(ind.row, ind.col)[2]]}
          emission={ind.emission}
        />
      ))}

      {/* Construction Sites */}
      {construction_sites && construction_sites.map((site, i) => (
        <ConstructionSite
          key={`con-${i}`}
          position={toWorld(site.row, site.col)}
          strength={site.strength}
        />
      ))}

      {/* Satellite Fire Markers */}
      {satellite_fires && satellite_fires.map((fire, i) => (
        <FireMarker
          key={`fire-${i}`}
          position={[toWorld(fire.row, fire.col)[0], 0.5, toWorld(fire.row, fire.col)[2]]}
          frp={fire.frp}
        />
      ))}

      {/* CAAQMS Stations */}
      {stations && stations.map((st, i) => (
        <StationMarker
          key={`st-${i}`}
          position={toWorld(st.row, st.col)}
          station={st}
        />
      ))}

      {/* Animated Traffic and Location Beacons */}
      <TrafficVisualiser
        gridVehicles={grid_vehicles}
        gridLocationUsers={grid_location_users}
        toWorld={toWorld}
      />

      {/* Pollution Plume Animation */}
      <PollutionPlume
        gridData={gridData}
        toWorld={toWorld}
      />

      {/* Wind Arrow */}
      {meteorology && (
        <WindArrow windDir={meteorology.wind_direction} windSpeed={meteorology.wind_speed} />
      )}

      {/* Orbit Controls */}
      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={6}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2.1}
        target={[0, 1.5, 0]}
      />
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Exported Component (with Canvas)
// ──────────────────────────────────────────────────────────────────────────────
export default function DigitalTwin3D({ gridData, selectedCell, onCellClick }) {
  // Sum overall vehicle counts and active signals for the city
  const totalVehicles = useMemo(() => {
    if (!gridData?.grid_vehicles) return 0;
    return gridData.grid_vehicles.flat().reduce((s, v) => s + v, 0);
  }, [gridData]);

  const totalLocationSignals = useMemo(() => {
    if (!gridData?.grid_location_users) return 0;
    return gridData.grid_location_users.flat().reduce((s, v) => s + v, 0);
  }, [gridData]);

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [14, 16, 18], fov: 50 }}
        gl={{ antialias: true }}
        shadows
        style={{ background: 'radial-gradient(ellipse at center, #0a0a14 0%, #030305 100%)' }}
      >
        <CityScene gridData={gridData} selectedCell={selectedCell} onCellClick={onCellClick} />
      </Canvas>

      {/* HUD Overlay */}
      <div className="absolute top-3 left-3 pointer-events-none space-y-2">
        <div className="bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-xs text-zinc-300 shadow-2xl">
          <p className="font-bold text-emerald-400 text-sm tracking-tight flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Digital Twin 3D View
          </p>
          <p className="text-[10px] text-zinc-500 mt-1">
            🖱 Left click + drag to rotate · Scroll to zoom
          </p>
        </div>

        {/* Live Crowd-Sourced Location Sharing HUD */}
        <div className="bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md px-3.5 py-2.5 rounded-xl text-[10px] text-zinc-400 space-y-1 shadow-2xl">
          <p className="font-bold uppercase tracking-wider text-zinc-300 border-b border-zinc-800 pb-1 mb-1">Telemetry Summary</p>
          <p className="flex justify-between gap-5">
            <span>Total Vehicles:</span>
            <strong className="text-zinc-200 font-mono">{totalVehicles} units</strong>
          </p>
          <p className="flex justify-between gap-5">
            <span>Location Beacons:</span>
            <strong className="text-emerald-400 font-mono">{totalLocationSignals} sharing</strong>
          </p>
          {gridData?.meteorology && (
            <>
              <p className="flex justify-between gap-5 border-t border-zinc-850 pt-1 mt-1">
                <span>Wind Speed:</span>
                <strong className="text-sky-400 font-mono">{gridData.meteorology.wind_speed} km/h</strong>
              </p>
              <p className="flex justify-between gap-5">
                <span>Wind Direction:</span>
                <strong className="text-sky-400 font-mono">{gridData.meteorology.wind_direction}°</strong>
              </p>
            </>
          )}
        </div>
      </div>

      {/* AQI Legend */}
      <div className="absolute bottom-3 right-3 pointer-events-none bg-zinc-950/85 border border-zinc-800/80 backdrop-blur-md px-3 py-2.5 rounded-xl text-[10px] space-y-1.5 shadow-2xl">
        <p className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">AQI Legend</p>
        {[
          ['Good', '#22c55e', '0-50'],
          ['Satisfactory', '#84cc16', '51-100'],
          ['Moderate', '#eab308', '101-200'],
          ['Poor', '#f97316', '201-300'],
          ['Very Poor', '#ef4444', '301-400'],
          ['Severe', '#a855f7', '401+']
        ].map(([l, c, r]) => (
          <div key={l} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
            <span className="text-zinc-400">{l} <span className="text-zinc-600">({r})</span></span>
          </div>
        ))}
      </div>
    </div>
  );
}



