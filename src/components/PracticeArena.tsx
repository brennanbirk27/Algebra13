import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Crosshair, RotateCcw, Volume2, VolumeX, Maximize2, ShieldAlert } from 'lucide-react';
import { sounds } from '../utils/audio';

interface PracticeArenaProps {
  mouseSensitivity: number;
  showCustomCrosshair: boolean;
  crosshairColor: string;
  crosshairSize: number;
}

interface Target {
  mesh: THREE.Group;
  head: THREE.Mesh;
  body: THREE.Mesh;
  hp: number;
  maxHp: number;
  initialPos: THREE.Vector3;
  respawnTime: number;
}

export const PracticeArena: React.FC<PracticeArenaProps> = ({
  mouseSensitivity,
  showCustomCrosshair,
  crosshairColor,
  crosshairSize,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [ammo, setAmmo] = useState(30);
  const [isReloading, setIsReloading] = useState(false);
  const [hitmarkerVisible, setHitmarkerVisible] = useState(false);
  const [hitmarkerHeadshot, setHitmarkerHeadshot] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [movementSpeed, setMovementSpeed] = useState(0);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const gunRef = useRef<THREE.Group | null>(null);
  const targetsRef = useRef<Target[]>([]);
  const animationFrameId = useRef<number | null>(null);

  // Player physics state
  const playerState = useRef({
    pos: new THREE.Vector3(0, 1.6, 10),
    vel: new THREE.Vector3(0, 0, 0),
    yaw: 0,
    pitch: 0,
    isGrounded: true,
    isSliding: false,
    slideCooldown: 0,
    keys: { w: false, a: false, s: false, d: false, space: false, shift: false },
    recoil: 0,
  });

  const sensitivity = (mouseSensitivity || 1.0) * 0.0022;

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.025);

    const camera = new THREE.PerspectiveCamera(80, width / height, 0.1, 100);
    cameraRef.current = camera;
    camera.position.set(0, 1.6, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Ambient & directional lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfef08a, 1.4);
    dirLight.position.set(20, 40, 20);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Krunker style grid arena floor
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid lines
    const grid = new THREE.GridHelper(80, 40, 0x38bdf8, 0x334155);
    grid.position.y = 0.01;
    scene.add(grid);

    // Arena walls (Krunker style boxes)
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const createWallBox = (x: number, y: number, z: number, w: number, h: number, d: number, color = 0x334155) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y + h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };

    // Obstacles & jump ramps
    createWallBox(-10, 0, -5, 4, 2, 4, 0x475569);
    createWallBox(10, 0, -8, 6, 3, 4, 0x475569);
    createWallBox(0, 0, -18, 8, 2.5, 3, 0x64748b);
    createWallBox(-15, 0, -15, 3, 4, 3, 0x3b82f6);
    createWallBox(15, 0, 5, 4, 1.5, 4, 0x10b981);

    // Target Dummies (Voxel style)
    const targets: Target[] = [];
    const spawnTarget = (x: number, z: number) => {
      const group = new THREE.Group();

      // Body (blue/cyan voxel)
      const bodyGeo = new THREE.BoxGeometry(0.8, 1.1, 0.4);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0284c7 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.05;
      body.castShadow = true;
      group.add(body);

      // Head (red voxel for headshots)
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.85;
      head.castShadow = true;
      group.add(head);

      group.position.set(x, 0, z);
      scene.add(group);

      targets.push({
        mesh: group,
        head,
        body,
        hp: 100,
        maxHp: 100,
        initialPos: new THREE.Vector3(x, 0, z),
        respawnTime: 0,
      });
    };

    // Spawn 6 targets across the arena
    spawnTarget(0, -10);
    spawnTarget(-10, -12);
    spawnTarget(10, -14);
    spawnTarget(-18, -4);
    spawnTarget(18, -6);
    spawnTarget(0, -25);
    targetsRef.current = targets;

    // First Person Weapon Model (Sniper / Assault Rifle)
    const gunGroup = new THREE.Group();
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9, roughness: 0.2 });
    const stockMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b }); // Gold accent

    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.7), barrelMat);
    barrel.position.set(0, 0, -0.3);
    gunGroup.add(barrel);

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.35), stockMat);
    bodyMesh.position.set(0, -0.04, 0);
    gunGroup.add(bodyMesh);

    const scopeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.25), barrelMat);
    scopeMesh.rotation.x = Math.PI / 2;
    scopeMesh.position.set(0, 0.1, -0.05);
    gunGroup.add(scopeMesh);

    gunGroup.position.set(0.24, -0.22, -0.45);
    camera.add(gunGroup);
    scene.add(camera);
    gunRef.current = gunGroup;

    // Resize handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Game loop
    let lastTime = performance.now();
    const animate = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Update player movement physics
      const p = playerState.current;
      const moveVec = new THREE.Vector3();

      if (p.keys.w) moveVec.z -= 1;
      if (p.keys.s) moveVec.z += 1;
      if (p.keys.a) moveVec.x -= 1;
      if (p.keys.d) moveVec.x += 1;
      moveVec.normalize();

      // Transform by yaw
      const forward = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)).negate();
      const right = new THREE.Vector3(Math.cos(p.yaw), 0, -Math.sin(p.yaw));

      const worldMove = new THREE.Vector3()
        .addScaledVector(forward, -moveVec.z)
        .addScaledVector(right, moveVec.x);

      // Krunker Slide-hopping mechanic
      const isShift = p.keys.shift;
      if (isShift && p.isGrounded && !p.isSliding) {
        p.isSliding = true;
        // Slide boost forward
        p.vel.addScaledVector(forward, 12);
      } else if (!isShift) {
        p.isSliding = false;
      }

      const speed = p.isSliding ? 22 : 11;
      if (worldMove.lengthSq() > 0) {
        p.vel.x = THREE.MathUtils.lerp(p.vel.x, worldMove.x * speed, dt * 10);
        p.vel.z = THREE.MathUtils.lerp(p.vel.z, worldMove.z * speed, dt * 10);
      } else {
        const friction = p.isSliding ? 0.98 : 0.82;
        p.vel.x *= Math.pow(friction, dt * 60);
        p.vel.z *= Math.pow(friction, dt * 60);
      }

      // Jump
      if (p.keys.space && p.isGrounded) {
        p.vel.y = 8.5;
        p.isGrounded = false;
        if (audioEnabled) sounds.playJump();
      }

      // Gravity
      p.vel.y -= 25 * dt;

      // Apply velocity
      p.pos.x += p.vel.x * dt;
      p.pos.y += p.vel.y * dt;
      p.pos.z += p.vel.z * dt;

      // Floor collision
      const eyeHeight = p.isSliding ? 0.9 : 1.6;
      if (p.pos.y <= eyeHeight) {
        p.pos.y = eyeHeight;
        p.vel.y = 0;
        p.isGrounded = true;
      }

      // Arena bounds
      p.pos.x = THREE.MathUtils.clamp(p.pos.x, -38, 38);
      p.pos.z = THREE.MathUtils.clamp(p.pos.z, -38, 38);

      // Update camera
      camera.position.copy(p.pos);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = p.yaw;
      camera.rotation.x = p.pitch;

      // Gun recoil return
      if (p.recoil > 0) {
        p.recoil = Math.max(0, p.recoil - dt * 8);
      }
      if (gunRef.current) {
        const bob = Math.sin(now * 0.01) * 0.004 * (worldMove.length() > 0 ? 2 : 0.5);
        gunRef.current.position.y = -0.22 + bob;
        gunRef.current.position.z = -0.45 + p.recoil * 0.08;
        gunRef.current.rotation.x = p.recoil * 0.15;
      }

      // Update speed display
      const currentSpeed = Math.round(new THREE.Vector2(p.vel.x, p.vel.z).length() * 3.6);
      setMovementSpeed(currentSpeed);

      // Target respawns & idle sway
      targetsRef.current.forEach((t) => {
        if (t.hp <= 0) {
          t.respawnTime -= dt;
          if (t.respawnTime <= 0) {
            t.hp = t.maxHp;
            t.mesh.visible = true;
            t.mesh.position.copy(t.initialPos);
          }
        } else {
          // Slight bobbing
          t.mesh.position.y = Math.sin(now * 0.003 + t.initialPos.x) * 0.1;
        }
      });

      renderer.render(scene, camera);
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, [audioEnabled]);

  // Pointer lock & mouse aim listener
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== mountRef.current) return;
      const p = playerState.current;
      p.yaw -= e.movementX * sensitivity;
      p.pitch -= e.movementY * sensitivity;
      // Clamp pitch (-89 deg to 89 deg)
      p.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, p.pitch));
    };

    const handleLockChange = () => {
      const locked = document.pointerLockElement === mountRef.current;
      setIsLocked(locked);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('pointerlockchange', handleLockChange);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('pointerlockchange', handleLockChange);
    };
  }, [sensitivity]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const p = playerState.current;
      if (k === 'w') p.keys.w = true;
      if (k === 'a') p.keys.a = true;
      if (k === 's') p.keys.s = true;
      if (k === 'd') p.keys.d = true;
      if (e.code === 'Space') {
        p.keys.space = true;
        e.preventDefault();
      }
      if (k === 'shift') p.keys.shift = true;
      if (k === 'r') {
        reloadWeapon();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const p = playerState.current;
      if (k === 'w') p.keys.w = false;
      if (k === 'a') p.keys.a = false;
      if (k === 's') p.keys.s = false;
      if (k === 'd') p.keys.d = false;
      if (e.code === 'Space') p.keys.space = false;
      if (k === 'shift') p.keys.shift = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const requestLock = () => {
    if (mountRef.current) {
      mountRef.current.requestPointerLock?.();
    }
  };

  const reloadWeapon = () => {
    if (isReloading || ammo === 30) return;
    setIsReloading(true);
    setTimeout(() => {
      setAmmo(30);
      setIsReloading(false);
    }, 1200);
  };

  // Shoot raycast & hit detection
  const handleShoot = () => {
    if (!isLocked) {
      requestLock();
      return;
    }
    if (ammo <= 0 || isReloading) {
      reloadWeapon();
      return;
    }

    setAmmo((prev) => prev - 1);
    playerState.current.recoil = 1.0;
    if (audioEnabled) sounds.playShoot();

    // Raycast from camera center
    if (!cameraRef.current || !sceneRef.current) return;
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), cameraRef.current);

    let hit = false;
    let isHead = false;

    for (const target of targetsRef.current) {
      if (target.hp <= 0) continue;

      // Check head first
      const headIntersects = raycaster.intersectObject(target.head, true);
      if (headIntersects.length > 0) {
        hit = true;
        isHead = true;
        target.hp = 0;
        target.mesh.visible = false;
        target.respawnTime = 2.0; // 2 sec respawn
        setScore((s) => s + 150);
        setStreak((st) => st + 1);
        break;
      }

      // Check body
      const bodyIntersects = raycaster.intersectObject(target.body, true);
      if (bodyIntersects.length > 0) {
        hit = true;
        target.hp -= 50;
        if (target.hp <= 0) {
          target.mesh.visible = false;
          target.respawnTime = 2.0;
        }
        setScore((s) => s + 100);
        setStreak((st) => st + 1);
        break;
      }
    }

    if (hit) {
      setHitmarkerHeadshot(isHead);
      setHitmarkerVisible(true);
      if (audioEnabled) sounds.playHitmarker(isHead);
      setTimeout(() => setHitmarkerVisible(false), 120);
    } else {
      setStreak(0);
    }
  };

  const resetArena = () => {
    setScore(0);
    setStreak(0);
    setAmmo(30);
    playerState.current.pos.set(0, 1.6, 10);
    playerState.current.vel.set(0, 0, 0);
    playerState.current.yaw = 0;
    playerState.current.pitch = 0;
    targetsRef.current.forEach((t) => {
      t.hp = t.maxHp;
      t.mesh.visible = true;
      t.mesh.position.copy(t.initialPos);
    });
  };

  return (
    <div className="relative w-full h-full bg-slate-950 select-none overflow-hidden flex flex-col">
      {/* 3D Canvas Container */}
      <div
        ref={mountRef}
        onClick={handleShoot}
        className="w-full flex-1 relative cursor-crosshair"
      >
        {/* Click to lock overlay */}
        {!isLocked && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center z-30 pointer-events-auto">
            <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md text-center shadow-2xl space-y-4">
              <div className="inline-flex p-3 bg-amber-500/20 text-amber-400 rounded-xl">
                <Crosshair className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black uppercase tracking-wider text-white">
                3D Krunker Aim & Slide Arena
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Practice 3D mouse aim, bunny-hopping, and slide-kicks in real-time WebGL. Hit red voxel heads for <span className="text-amber-400 font-bold">+150</span> and blue bodies for <span className="text-sky-400 font-bold">+100</span>.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  requestLock();
                }}
                className="w-full py-3 px-6 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/25 transition-transform active:scale-95 cursor-pointer"
              >
                Click to Lock Mouse & Play
              </button>
              <div className="text-xs text-slate-400 flex justify-center gap-4 pt-1">
                <span>[WASD] Move</span>
                <span>[Shift] Slide</span>
                <span>[Space] Jump</span>
                <span>[L-Click] Shoot</span>
                <span>[R] Reload</span>
              </div>
            </div>
          </div>
        )}

        {/* Center Crosshair */}
        {showCustomCrosshair && isLocked && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center"
          >
            <div
              style={{
                width: `${crosshairSize}px`,
                height: `${crosshairSize}px`,
                backgroundColor: crosshairColor,
                borderRadius: '50%',
                boxShadow: `0 0 6px ${crosshairColor}`,
              }}
            />
            {/* Crosshair ticks */}
            <div
              style={{
                borderColor: crosshairColor,
              }}
              className="absolute w-5 h-5 border border-dashed rounded-full opacity-60"
            />
          </div>
        )}

        {/* Hitmarker feedback */}
        {hitmarkerVisible && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
            <div
              className={`w-7 h-7 relative animate-ping ${
                hitmarkerHeadshot ? 'text-red-500' : 'text-amber-400'
              }`}
            >
              <div className="absolute top-0 left-0 w-2 h-0.5 bg-current rotate-45 origin-top-left" />
              <div className="absolute top-0 right-0 w-2 h-0.5 bg-current -rotate-45 origin-top-right" />
              <div className="absolute bottom-0 left-0 w-2 h-0.5 bg-current -rotate-45 origin-bottom-left" />
              <div className="absolute bottom-0 right-0 w-2 h-0.5 bg-current rotate-45 origin-bottom-right" />
            </div>
            <div
              className={`text-xs font-black uppercase text-center mt-6 ${
                hitmarkerHeadshot ? 'text-red-400' : 'text-amber-300'
              }`}
            >
              {hitmarkerHeadshot ? '+150 HEADSHOT' : '+100 HIT'}
            </div>
          </div>
        )}

        {/* In-Game HUD Elements */}
        {isLocked && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
            {/* Top Stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
                  <div className="text-xl font-black text-amber-400">{score}</div>
                </div>
                <div className="w-px h-8 bg-slate-700" />
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Streak</div>
                  <div className="text-xl font-black text-sky-400">{streak}x</div>
                </div>
              </div>

              {/* Speedometer (Krunker bunnyhop indicator) */}
              <div className="bg-slate-900/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-700/60 text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Speed (Slidehop)</div>
                <div className="text-xl font-black font-mono text-emerald-400">
                  {movementSpeed} <span className="text-xs text-slate-400">KM/H</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD: Ammo & Help */}
            <div className="flex items-end justify-between">
              <div className="text-xs text-slate-400 bg-slate-900/70 px-3 py-1.5 rounded-lg border border-slate-800">
                Press <span className="text-amber-400 font-bold">ESC</span> to release mouse aim
              </div>

              <div className="bg-slate-900/85 backdrop-blur-md px-5 py-3 rounded-2xl border border-slate-700/60 flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {isReloading ? 'Reloading...' : 'Magazine'}
                  </div>
                  <div className="text-2xl font-black font-mono text-white">
                    {ammo} <span className="text-sm text-slate-400">/ 30</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    reloadWeapon();
                  }}
                  className="pointer-events-auto text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg font-bold"
                >
                  [R]
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Control bar below canvas */}
      <div className="bg-slate-900 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-200">Offline WebGL Arena Active</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">Slide-hopping physics enabled</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            title={audioEnabled ? 'Mute Sounds' : 'Enable Sounds'}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <button
            onClick={resetArena}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Targets
          </button>
          <button
            onClick={requestLock}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer"
          >
            <Crosshair className="w-3.5 h-3.5" />
            Lock Aim
          </button>
        </div>
      </div>
    </div>
  );
};
