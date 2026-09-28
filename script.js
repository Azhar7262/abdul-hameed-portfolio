/* ============================================================
   3D PARTICLE GLOBE BACKGROUND + PAGE INTERACTIONS
   ============================================================ */

/* ---------- PRELOADER ---------- */
window.addEventListener("load", () => {
  const pre = document.getElementById("preloader");
  setTimeout(() => pre.classList.add("hidden"), 600);
});

/* ---------- CURRENT YEAR ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* ============================================================
   THREE.JS — 3D PARTICLE GLOBE + FLOATING PARTICLES
   ============================================================ */
(function init3DBackground() {
  if (typeof THREE === "undefined") return;

  const canvas = document.getElementById("bg3d");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    60, window.innerWidth / window.innerHeight, 0.1, 100
  );
  camera.position.z = 7.5;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  /* --- Main particle globe --- */
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);
  globeGroup.position.set(2.6, 0.3, 0); // offset right so text stays readable

  const globeRadius = 3.4;
  const globeCount = 9000;
  const globePositions = new Float32Array(globeCount * 3);
  const globeColors = new Float32Array(globeCount * 3);

  const c1 = new THREE.Color("#00e5a0");
  const c2 = new THREE.Color("#4f8cff");
  const c3 = new THREE.Color("#a855f7");

  for (let i = 0; i < globeCount; i++) {
    // Fibonacci sphere for even distribution
    const y = 1 - (i / (globeCount - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;

    // Push some points slightly above/below surface for depth
    const wobble = 1 + (Math.random() - 0.5) * 0.12;
    const x = Math.cos(theta) * r * globeRadius * wobble;
    const z = Math.sin(theta) * r * globeRadius * wobble;
    const yy = y * globeRadius * wobble;

    globePositions[i * 3] = x;
    globePositions[i * 3 + 1] = yy;
    globePositions[i * 3 + 2] = z;

    // Color mix based on position
    const mix = (Math.sin(theta) + 1) / 2;
    const col = mix < 0.5 ? c1.clone().lerp(c2, mix * 2) : c2.clone().lerp(c3, (mix - 0.5) * 2);
    globeColors[i * 3] = col.r;
    globeColors[i * 3 + 1] = col.g;
    globeColors[i * 3 + 2] = col.b;
  }

  const globeGeo = new THREE.BufferGeometry();
  globeGeo.setAttribute("position", new THREE.BufferAttribute(globePositions, 3));
  globeGeo.setAttribute("color", new THREE.BufferAttribute(globeColors, 3));

  const globeMat = new THREE.PointsMaterial({
    size: 0.028,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const globe = new THREE.Points(globeGeo, globeMat);
  globeGroup.add(globe);

  /* --- Inner wireframe core for depth --- */
  const coreGeo = new THREE.IcosahedronGeometry(globeRadius * 0.55, 2);
  const coreMat = new THREE.MeshBasicMaterial({
    color: 0x4f8cff,
    wireframe: true,
    transparent: true,
    opacity: 0.07,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  globeGroup.add(core);

  /* --- Ambient floating particles (whole screen) --- */
  const dustCount = 900;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 22;
    dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 2;
    const col = [c1, c2, c3][Math.floor(Math.random() * 3)];
    dustColors[i * 3] = col.r;
    dustColors[i * 3 + 1] = col.g;
    dustColors[i * 3 + 2] = col.b;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
  const dustMat = new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  scene.add(dust);

  /* --- Connection arcs (great-circle-ish curves) --- */
  const arcsGroup = new THREE.Group();
  globeGroup.add(arcsGroup);

  function randomPointOnSphere(r) {
    const u = Math.random(), v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }

  for (let i = 0; i < 10; i++) {
    const start = randomPointOnSphere(globeRadius * 1.02);
    const end = randomPointOnSphere(globeRadius * 1.02);
    const mid = start.clone().add(end).multiplyScalar(0.5).normalize()
      .multiplyScalar(globeRadius * (1.35 + Math.random() * 0.35));
    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    const pts = curve.getPoints(48);
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: i % 2 ? 0x4f8cff : 0x00e5a0,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
    });
    arcsGroup.add(new THREE.Line(geo, mat));
  }

  /* --- Mouse interaction --- */
  let mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0;
  window.addEventListener("mousemove", (e) => {
    targetMX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  /* --- Scroll parallax --- */
  let scrollY = 0;
  window.addEventListener("scroll", () => {
    scrollY = window.scrollY;
  }, { passive: true });

  /* --- Animation loop --- */
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    mouseX += (targetMX - mouseX) * 0.05;
    mouseY += (targetMY - mouseY) * 0.05;

    globe.rotation.y = t * 0.07 + mouseX * 0.35;
    globe.rotation.x = Math.sin(t * 0.12) * 0.08 + mouseY * 0.15;
    core.rotation.y = -t * 0.12;
    core.rotation.z = t * 0.05;
    arcsGroup.rotation.y = globe.rotation.y;
    arcsGroup.rotation.x = globe.rotation.x;

    dust.rotation.y = t * 0.015;
    dust.rotation.x = t * 0.008;

    // subtle scroll parallax
    globeGroup.position.y = 0.3 - scrollY * 0.0012;
    camera.position.x = mouseX * 0.4;
    camera.position.y = mouseY * 0.3;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();

  /* --- Resize --- */
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* --- Reposition globe on small screens --- */
  function layoutGlobe() {
    if (window.innerWidth < 760) {
      globeGroup.position.x = 0;
      globeGroup.scale.setScalar(0.78);
      globeMat.opacity = 0.4;
    } else {
      globeGroup.position.x = 2.6;
      globeGroup.scale.setScalar(1);
      globeMat.opacity = 0.85;
    }
  }
  layoutGlobe();
  window.addEventListener("resize", layoutGlobe);
})();

/* ============================================================
   TYPING EFFECT (hero roles)
   ============================================================ */
(function typingEffect() {
  const roles = [
    "Project Coordination",
    "Data Management",
    "Monitoring & Evaluation",
    "IT Support & Training",
    "Community Engagement",
  ];
  const el = document.querySelector(".typed");
  if (!el) return;

  let roleIdx = 0, charIdx = 0, deleting = false;

  function tick() {
    const current = roles[roleIdx];
    if (deleting) {
      charIdx--;
      el.textContent = current.substring(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(tick, 400);
        return;
      }
      setTimeout(tick, 38);
    } else {
      charIdx++;
      el.textContent = current.substring(0, charIdx);
      if (charIdx === current.length) {
        deleting = true;
        setTimeout(tick, 1900);
        return;
      }
      setTimeout(tick, 85);
    }
  }
  tick();
})();

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
(function scrollReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
})();

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
(function counters() {
  const nums = document.querySelectorAll(".stat-num");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = +el.dataset.count;
        const duration = 1800;
        const start = performance.now();

        function update(now) {
          const p = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
          el.textContent = Math.round(target * eased).toLocaleString();
          if (p < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
        observer.unobserve(el);
      });
    },
    { threshold: 0.4 }
  );
  nums.forEach((n) => observer.observe(n));
})();

/* ============================================================
   NAVBAR: scrolled state, active link, mobile menu
   ============================================================ */
(function navbar() {
  const nav = document.getElementById("navbar");
  const burger = document.getElementById("burger");
  const links = document.getElementById("navLinks");
  const navAnchors = document.querySelectorAll(".nav-link");

  window.addEventListener("scroll", () => {
    nav.classList.toggle("scrolled", window.scrollY > 40);
  }, { passive: true });

  burger.addEventListener("click", () => {
    burger.classList.toggle("open");
    links.classList.toggle("open");
  });

  links.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      burger.classList.remove("open");
      links.classList.remove("open");
    })
  );

  // Active section highlighting
  const sections = document.querySelectorAll("section[id]");
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navAnchors.forEach((a) =>
            a.classList.toggle(
              "active",
              a.getAttribute("href") === "#" + entry.target.id
            )
          );
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  sections.forEach((s) => spy.observe(s));
})();

/* ============================================================
   SKILL CARD SPOTLIGHT (mouse-follow glow)
   ============================================================ */
document.querySelectorAll(".skill-card").forEach((card) => {
  card.addEventListener("mousemove", (e) => {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", e.clientX - r.left + "px");
    card.style.setProperty("--my", e.clientY - r.top + "px");
  });
});
