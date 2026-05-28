"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import * as THREE from "three";

type CorporateSceneProps = {
  className?: string;
  compact?: boolean;
};

function makeMonitorTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 320;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  context.fillStyle = "#10253d";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const grid = "rgba(170, 214, 220, 0.14)";
  context.strokeStyle = grid;
  context.lineWidth = 1;

  for (let x = 18; x < canvas.width; x += 28) {
    context.beginPath();
    context.moveTo(x, 22);
    context.lineTo(x, canvas.height - 22);
    context.stroke();
  }

  for (let y = 18; y < canvas.height; y += 24) {
    context.beginPath();
    context.moveTo(22, y);
    context.lineTo(canvas.width - 22, y);
    context.stroke();
  }

  context.beginPath();
  context.moveTo(34, 168);
  context.bezierCurveTo(70, 120, 115, 112, 150, 126);
  context.bezierCurveTo(184, 92, 236, 84, 290, 118);
  context.bezierCurveTo(332, 90, 392, 108, 434, 150);
  context.bezierCurveTo(402, 206, 350, 232, 286, 228);
  context.bezierCurveTo(232, 252, 178, 252, 136, 220);
  context.bezierCurveTo(82, 226, 52, 206, 34, 168);
  context.closePath();
  context.fillStyle = "rgba(228, 239, 245, 0.9)";
  context.fill();

  context.beginPath();
  context.arc(210, 162, 22, 0, Math.PI * 2);
  context.fillStyle = "rgba(47, 139, 146, 0.95)";
  context.fill();

  context.beginPath();
  context.arc(210, 162, 46, 0, Math.PI * 2);
  const highlight = context.createRadialGradient(210, 162, 12, 210, 162, 46);
  highlight.addColorStop(0, "rgba(47, 139, 146, 0.45)");
  highlight.addColorStop(1, "rgba(47, 139, 146, 0)");
  context.fillStyle = highlight;
  context.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function CorporateScene({ className, compact = false }: CorporateSceneProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, compact ? 2.1 : 2.35, compact ? 9.8 : 10.8);
    camera.lookAt(0, 0.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 1.4);
    const keyLight = new THREE.DirectionalLight(0xf4fbfd, 1.15);
    keyLight.position.set(4, 6, 6);
    const fillLight = new THREE.DirectionalLight(0x9cc8cf, 0.8);
    fillLight.position.set(-4, 1, 3);
    scene.add(ambient, keyLight, fillLight);

    const root = new THREE.Group();
    scene.add(root);

    const shellMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf5fafc,
      roughness: 0.58,
      metalness: 0.06,
      clearcoat: 0.18,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: 0x2f8b92,
      roughness: 0.48,
      metalness: 0.08,
    });

    const darkMaterial = new THREE.MeshStandardMaterial({
      color: 0x223245,
      roughness: 0.54,
      metalness: 0.12,
    });

    const softMetalMaterial = new THREE.MeshStandardMaterial({
      color: 0xcfdbe1,
      roughness: 0.72,
      metalness: 0.18,
    });

    const tunnelOuter = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 2.2, 72, 1, true), shellMaterial);
    tunnelOuter.rotation.z = Math.PI / 2;
    tunnelOuter.position.set(0.55, 1.26, 0);

    const tunnelInner = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, 2.32, 72), new THREE.MeshStandardMaterial({
      color: 0xe8f1f5,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.BackSide,
    }));
    tunnelInner.rotation.z = Math.PI / 2;
    tunnelInner.position.copy(tunnelOuter.position);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.1, 26, 92), accentMaterial);
    rim.rotation.y = Math.PI / 2;
    rim.position.set(-0.56, 1.26, 0);

    const table = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.18, 1.1), shellMaterial);
    table.position.set(0.45, 0.36, 0);

    const tableBase = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.94), softMetalMaterial);
    tableBase.position.set(-1.95, -0.16, 0);

    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.74), accentMaterial);
    headrest.position.set(-1.7, 0.52, 0);

    const patientBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 2.15, 10, 22), darkMaterial);
    patientBody.rotation.z = Math.PI / 2;
    patientBody.position.set(-0.15, 0.62, 0);

    const patientHead = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 24), darkMaterial);
    patientHead.position.set(-1.52, 0.72, 0);

    const coilRing = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.06, 16, 52), accentMaterial);
    coilRing.rotation.y = Math.PI / 2;
    coilRing.position.set(-1.26, 0.72, 0);

    const monitorArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.82, 0.12), softMetalMaterial);
    monitorArm.position.set(2.76, 1.15, -1.02);

    const monitor = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.08, 0.08),
      new THREE.MeshStandardMaterial({ map: makeMonitorTexture(), roughness: 0.36, metalness: 0.12 })
    );
    monitor.position.set(2.76, 2.02, -1.02);
    monitor.rotation.y = -0.22;

    const monitorBezel = new THREE.Mesh(new THREE.BoxGeometry(1.84, 1.22, 0.12), shellMaterial);
    monitorBezel.position.copy(monitor.position);
    monitorBezel.position.z += 0.01;
    monitorBezel.rotation.copy(monitor.rotation);

    const floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(8.8, 5.6),
      new THREE.MeshBasicMaterial({ color: 0xd8e4ea, transparent: true, opacity: 0.28 })
    );
    floorShadow.rotation.x = -Math.PI / 2;
    floorShadow.position.set(0.15, -0.68, 0);

    root.add(
      tunnelOuter,
      tunnelInner,
      rim,
      table,
      tableBase,
      headrest,
      patientBody,
      patientHead,
      coilRing,
      monitorArm,
      monitorBezel,
      monitor,
      floorShadow
    );

    root.rotation.set(-0.08, -0.56, 0);
    root.position.set(0, -0.12, 0);

    const resize = () => {
      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    resize();

    const intro = gsap.timeline();
    intro.fromTo(root.rotation, { x: 0.18, y: -0.92 }, { x: -0.08, y: -0.56, duration: 1.5, ease: "power3.out" });
    intro.fromTo(root.position, { y: 0.64 }, { y: -0.12, duration: 1.3, ease: "power2.out" }, 0);

    const motions = [
      gsap.to(root.rotation, { y: "-=0.08", duration: compact ? 7.5 : 9.5, yoyo: true, repeat: -1, ease: "sine.inOut" }),
      gsap.to(table.position, { x: "+=0.18", duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" }),
      gsap.to([patientBody.position, patientHead.position, coilRing.position], { x: "+=0.18", duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" }),
      gsap.to(coilRing.scale, { x: 1.05, y: 1.05, duration: 1.6, yoyo: true, repeat: -1, ease: "sine.inOut" }),
      gsap.to(rim.material, { opacity: 0.82, duration: 1.7, yoyo: true, repeat: -1, ease: "sine.inOut" }),
    ];

    let frameId = 0;
    const renderLoop = () => {
      frameId = window.requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    };
    renderLoop();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(frameId);
      intro.kill();
      motions.forEach((motion) => motion.kill());
      renderer.dispose();
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
      container.removeChild(renderer.domElement);
    };
  }, [compact]);

  return <div ref={containerRef} className={className} aria-hidden="true" />;
}
