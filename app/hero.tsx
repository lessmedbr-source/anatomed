import { useEffect, useRef, useState } from "react";
import * as T from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { SYSTEMS, type Atlas } from "./anatomy";
import { fetchModelChunk } from "./model-download";
import { defaultModelQuality, modelManifest, stableViewport } from "./model-quality";
import { ModelQualityControl } from "./model-quality-control";

export default function Hero({
  separated = false,
  paused = false,
}: {
  separated?: boolean;
  paused?: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    intent = useRef({ separated, paused });
  intent.current = { separated, paused };
  const [quality, setQuality] = useState(defaultModelQuality);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading"),
    [progress, setProgress] = useState(0),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const el = host.current!;
    const mobile = matchMedia("(max-width: 767px)").matches,
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let dead = false,
      raf = 0,
      visible = true,
      ready = false,
      last = 0,
      amount = 0,
      dirty = true,
      interacting = false,
      lastInteraction = 0;
    let viewport = { width: 0, height: 0 },
      resizeFrame = 0,
      loaded = 0,
      failed = false;
    const abort = new AbortController();
    setState("loading");
    setProgress(0);
    let renderer: T.WebGLRenderer;
    try {
      renderer = new T.WebGLRenderer({
        alpha: true,
        antialias: !mobile,
        powerPreference: mobile ? "low-power" : "high-performance",
      });
    } catch {
      setState("error");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.15 : 1.7));
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const canvas = renderer.domElement;
    el.appendChild(canvas as unknown as Node);
    canvas.setAttribute("aria-label", "Corpo humano 3D detalhado e colorido. Arraste para girar.");
    canvas.setAttribute("role", "img");
    const scene = new T.Scene(),
      camera = new T.PerspectiveCamera(31, 1, 0.02, 30);
    const controls = new OrbitControls(camera, canvas);
    controls.target.set(0, 0.86, 0);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minPolarAngle = 0.75;
    controls.maxPolarAngle = 2.1;
    canvas.style.touchAction = "pan-y";
    controls.addEventListener("change", () => {
      dirty = true;
    });
    controls.addEventListener("start", () => {
      interacting = true;
    });
    controls.addEventListener("end", () => {
      interacting = false;
      lastInteraction = performance.now();
    });
    const group = new T.Group();
    group.rotation.y = -0.12;
    scene.add(group);
    scene.add(new T.HemisphereLight(0xffffff, 0x414753, 1.6));
    for (const [x, y, z, power, color] of [
      [-2, 3, 3, 2.6, 0xfffaf4],
      [2, 1, 2, 0.9, 0xf2f6ff],
      [1, 3, -2, 2.4, 0xffffff],
    ]) {
      const light = new T.DirectionalLight(color, power);
      light.position.set(x, y, z);
      scene.add(light);
    }
    let env: T.WebGLRenderTarget | undefined;
    if (!mobile) {
      const pmrem = new T.PMREMGenerator(renderer),
        room = new RoomEnvironment();
      try {
        env = pmrem.fromScene(room, 0.04);
        scene.environment = env.texture;
      } catch {
        /* Direct lighting remains available. */
      } finally {
        room.dispose();
        pmrem.dispose();
      }
    }
    const materials = new Map(
      SYSTEMS.map((s) => [
        s.id,
        new T.MeshStandardMaterial({
          color: s.color,
          roughness: s.id === "skeletal" ? 0.7 : 0.58,
          metalness: 0.02,
          side: T.DoubleSide,
        }),
      ]),
    );
    const meshes: { mesh: T.Mesh; offset: T.Vector3 }[] = [];
    const fail = () => {
      if (!dead) {
        failed = true;
        setState("error");
      }
    };
    renderer.debug.onShaderError = fail;
    const resize = () => {
      const next = stableViewport(el.clientWidth, el.clientHeight, viewport);
      if (!next || dead) return;
      const first = !viewport.width;
      viewport = next;
      renderer.setSize(next.width, next.height, false);
      camera.aspect = next.width / next.height;
      const distance =
        Math.max(1.92, 0.97 / camera.aspect) / (2 * Math.tan(T.MathUtils.degToRad(camera.fov / 2)));
      const direction = first
        ? new T.Vector3(0, 0.045, 1)
        : camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(direction, distance);
      camera.updateProjectionMatrix();
      controls.update();
      dirty = true;
    };
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(resize);
    });
    ro.observe(el);
    resize();
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      dirty = true;
    });
    io.observe(el);
    const frame = (now: number) => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      if (!visible || document.hidden || !ready || failed || now - last < (mobile ? 32 : 16))
        return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const target = intent.current.separated ? 1 : 0;
      if (Math.abs(amount - target) > 0.0001) {
        amount = reduced ? target : T.MathUtils.damp(amount, target, 6, dt);
        if (Math.abs(amount - target) < 0.0001) amount = target;
        for (const { mesh, offset } of meshes) mesh.position.copy(offset).multiplyScalar(amount);
        dirty = true;
      }
      if (!intent.current.paused && !reduced && !interacting && now - lastInteraction > 2000) {
        group.rotation.y += dt * 0.075;
        dirty = true;
      }
      controls.update();
      if (dirty) {
        renderer.render(scene, camera);
        dirty = false;
      }
    };
    raf = requestAnimationFrame(frame);
    (async () => {
      try {
        const response = await fetch(modelManifest(quality), { signal: abort.signal });
        if (!response.ok) throw Error("Catálogo indisponível.");
        const atlas = (await response.json()) as Atlas;
        if (!Array.isArray(atlas.parts) || !atlas.chunks?.length)
          throw Error("Catálogo incompleto.");
        // Reuse original atlas buffers, never the former 3.5–8% presentation mesh.
        // Stream large body regions first, retaining every original vertex and normal.
        const scores = atlas.chunks.map((_, ci) =>
          atlas.parts
            .filter((p) => p.chunk === ci && p.system === "muscular")
            .reduce((n, p) => n + p.indexCount, 0),
        );
        const order = atlas.chunks.map((_, ci) => ci).sort((a, b) => scores[b] - scores[a]);
        let cursor = 0;
        const load = async (ci: number) => {
          const buffer = await fetchModelChunk(atlas.chunks[ci], abort.signal);
          if (dead) return;
          const buckets = new Map<
            string,
            {
              geometries: T.BufferGeometry[];
              system: (typeof atlas.parts)[number]["system"];
              offset: T.Vector3;
            }
          >();
          for (const p of atlas.parts) {
            if (p.chunk !== ci || p.system === "integumentary") continue;
            const x = (p.bounds[0][0] + p.bounds[1][0]) / 2,
              y = (p.bounds[0][1] + p.bounds[1][1]) / 2;
            const region =
              y > 1.43
                ? "head"
                : y < 0.72
                  ? x < 0
                    ? "leg-l"
                    : "leg-r"
                  : Math.abs(x) > 0.18
                    ? x < 0
                      ? "arm-l"
                      : "arm-r"
                    : "torso";
            const key = region + ":" + p.system;
            const offset = new T.Vector3(
              region.endsWith("-l") ? -0.08 : region.endsWith("-r") ? 0.08 : 0,
              region === "head" ? 0.08 : region.startsWith("leg") ? -0.05 : 0,
              p.system === "skeletal" ? 0 : p.system === "muscular" ? 0.025 : 0.2,
            );
            const g = new T.BufferGeometry();
            g.setAttribute(
              "position",
              new T.BufferAttribute(new Float32Array(buffer, p.positions, p.vertexCount * 3), 3),
            );
            g.setAttribute(
              "normal",
              new T.BufferAttribute(new Int16Array(buffer, p.normals, p.vertexCount * 3), 3, true),
            );
            g.setIndex(new T.BufferAttribute(new Uint32Array(buffer, p.indices, p.indexCount), 1));
            const bucket = buckets.get(key) ?? { geometries: [], system: p.system, offset };
            bucket.geometries.push(g);
            buckets.set(key, bucket);
          }
          for (const b of buckets.values()) {
            const geometry = mergeGeometries(b.geometries, false);
            b.geometries.forEach((g) => g.dispose());
            if (!geometry) throw Error("Modelo incompleto.");
            const mesh = new T.Mesh(geometry, materials.get(b.system));
            mesh.position.copy(b.offset).multiplyScalar(amount);
            group.add(mesh);
            meshes.push({ mesh, offset: b.offset });
          }
          loaded++;
          ready = meshes.length > 0;
          dirty = true;
          if (!dead && !failed) {
            setProgress(Math.round((loaded / atlas.chunks.length) * 100));
            if (ready) setState("ready");
          }
        };
        await Promise.all(
          Array.from({ length: mobile ? 1 : 2 }, async () => {
            while (cursor < order.length && !dead) {
              await load(order[cursor++]);
              await new Promise((resolve) => setTimeout(resolve, 0));
            }
          }),
        );
      } catch (e) {
        if (!dead && (e as Error).name !== "AbortError") {
          abort.abort();
          fail();
        }
      }
    })();
    const lost = (e: Event) => {
      e.preventDefault();
      abort.abort();
      fail();
    };
    canvas.addEventListener("webglcontextlost", lost);
    return () => {
      dead = true;
      abort.abort();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(resizeFrame);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      meshes.forEach((m) => m.mesh.geometry.dispose());
      materials.forEach((m) => m.dispose());
      env?.dispose();
      canvas.removeEventListener("webglcontextlost", lost);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
  }, [quality, retry]);
  return (
    <div className="anatomy-art" ref={host}>
      <div className="hero-quality">
        <ModelQualityControl value={quality} onChange={setQuality} />
      </div>
      {state === "loading" && (
        <div className="art-state" role="status">
          Preparando o corpo em detalhes
          <span className="art-loader" />
        </div>
      )}
      {state === "ready" && progress < 100 && (
        <span className="hero-load-progress" role="status">
          Carregando os detalhes · {progress}%
        </span>
      )}
      {state === "error" && (
        <div className="art-state" role="alert">
          Não foi possível concluir o 3D neste aparelho.
          <button
            onClick={() => {
              setQuality("light");
              setRetry((n) => n + 1);
            }}
          >
            Tentar versão leve
          </button>
        </div>
      )}
    </div>
  );
}
