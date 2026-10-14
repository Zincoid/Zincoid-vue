<script setup>
// WebGL noise cover banner — domain-warped fbm posterized into the five
// --noise-* theme bands with ordered dithering. The field is stirred by the
// pointer (click drops a ripple) and drifts on its own while idle. Renders at
// reduced resolution and upscales pixelated; a flat token color stands in when
// WebGL is unavailable, and a single static frame is drawn for reduced motion.
import { ref, onMounted, onBeforeUnmount } from 'vue'

const rootEl = ref(null)
const canvasEl = ref(null)
let stop = null

onMounted(() => {
  stop = initNoise(canvasEl.value, rootEl.value)
})

onBeforeUnmount(() => {
  if (stop) stop()
})

function initNoise(canvas, host) {
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false })
  if (!gl) return null

  const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`
  const FRAG = `
precision highp float;
uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform vec3 uRip;
uniform vec3 c0; uniform vec3 c1; uniform vec3 c2; uniform vec3 c3; uniform vec3 c4;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x),
             mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0., a = .5;
  mat2 rot = mat2(.8, .6, -.6, .8);
  for (int i = 0; i < 5; i++){ v += a * vnoise(p); p = rot * p * 2.02; a *= .5; }
  return v;
}
// 2x2 ordered-dither threshold; two octaves give the 4x4 Bayer pattern
float dither2(vec2 a){ a = floor(mod(a, 2.)); return fract(a.x * .5 + a.y * .75); }
float dither4(vec2 a){ return dither2(a * .5) * .25 + dither2(a); }

void main(){
  vec2 uv = gl_FragCoord.xy / uRes.y;
  float t = uTime * .1;

  // two-stage domain warp: noise fields steering noise fields — the .6 base
  // frequency keeps blobs large across the wide banner (1.6 looked miniature)
  vec2 q = vec2(fbm(uv * .6 + vec2(0., t)), fbm(uv * .6 + vec2(3.7, 8.1) - t));
  vec2 dm = uv - uMouse;
  float md = length(dm);
  // local stir — keep the displacement moderate and the gaussian tight, or
  // the warp reads as an obvious blob tracking the pointer
  q += dm * exp(-md * md * 6.) * 1.2;
  vec2 r = vec2(fbm(uv * .6 + 2.8 * q + vec2(4.3, 2.1) + t * 1.2),
                fbm(uv * .6 + 2.8 * q + vec2(9.4, 6.6) - t * .9));
  float f = fbm(uv * .6 + 2.8 * r);

  // click ripple — an expanding ring decaying in time and space
  float rt = uTime - uRip.z;
  float rd = length(uv - uRip.xy);
  f += .18 * sin(rd * 20. - rt * 8.) * exp(-rt * 1.2) * exp(-rd * 1.5) * step(0., rt);

  f = pow(smoothstep(.1, .95, f), 1.2);
  float v = clamp(f + (dither4(gl_FragCoord.xy) - .5) * .16, 0., .999);
  float k = floor(v * 5.);
  vec3 col = c0;
  if (k >= 1.) col = c1;
  if (k >= 2.) col = c2;
  if (k >= 3.) col = c3;
  if (k >= 4.) col = c4;
  gl_FragColor = vec4(col, 1.);
}`

  function compile(type, src) {
    const s = gl.createShader(type)
    gl.shaderSource(s, src)
    gl.compileShader(s)
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn(gl.getShaderInfoLog(s))
      return null
    }
    return s
  }

  const vs = compile(gl.VERTEX_SHADER, VERT)
  const fs = compile(gl.FRAGMENT_SHADER, FRAG)
  if (!vs || !fs) return null
  const prog = gl.createProgram()
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  gl.useProgram(prog)

  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

  const uni = name => gl.getUniformLocation(prog, name)
  const uRes = uni('uRes')
  const uTime = uni('uTime')
  const uMouse = uni('uMouse')
  const uRip = uni('uRip')
  const uCols = ['c0', 'c1', 'c2', 'c3', 'c4'].map(uni)

  // band colors come from the --noise-* tokens so theme swaps re-tint the field
  function readPalette() {
    const cs = getComputedStyle(document.documentElement)
    uCols.forEach((u, i) => {
      const hex = cs.getPropertyValue(`--noise-${i}`).trim().replace('#', '')
      const n = parseInt(hex, 16)
      gl.uniform3f(u, (n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255)
    })
  }

  // low-res render + pixelated upscale keeps the shader cheap
  const SCALE = 0.35
  function resize() {
    const r = host.getBoundingClientRect()
    const w = Math.max(1, Math.round(r.width * SCALE))
    const h = Math.max(1, Math.round(r.height * SCALE))
    canvas.width = w
    canvas.height = h
    gl.viewport(0, 0, w, h)
    gl.uniform2f(uRes, w, h)
  }

  const start = performance.now()
  const mouse = { x: .5, y: .5, tx: .5, ty: .5, active: false, idle: 0 }
  let ripple = [-9, -9, -99]
  const toUV = (clientX, clientY) => {
    const r = host.getBoundingClientRect()
    return [(clientX - r.left) / r.height, (r.bottom - clientY) / r.height]
  }

  function onMove(e) {
    [mouse.tx, mouse.ty] = toUV(e.clientX, e.clientY)
    mouse.active = true
    clearTimeout(mouse.idle)
    mouse.idle = setTimeout(() => { mouse.active = false }, 2500)
  }
  function onDown(e) {
    const [x, y] = toUV(e.clientX, e.clientY)
    ripple = [x, y, (performance.now() - start) / 1000]
  }
  function onThemeChange() {
    readPalette()
  }

  host.addEventListener('pointermove', onMove, { passive: true })
  host.addEventListener('pointerdown', onDown)
  window.addEventListener('resize', resize)
  // theme store flips data-theme on <html>; re-read the palette when it does
  const themeObserver = new MutationObserver(onThemeChange)
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let visible = true
  const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
  io.observe(host)

  function draw(now) {
    const t = (now - start) / 1000
    if (!mouse.active) {
      // idle drift so the field never freezes
      const aspect = canvas.width / canvas.height
      mouse.tx = aspect * (.5 + Math.cos(t * .3) * .2)
      mouse.ty = .5 + Math.sin(t * .38) * .2
    }
    mouse.x += (mouse.tx - mouse.x) * .08
    mouse.y += (mouse.ty - mouse.y) * .08
    gl.uniform1f(uTime, t)
    gl.uniform2f(uMouse, mouse.x, mouse.y)
    gl.uniform3f(uRip, ripple[0], ripple[1], ripple[2])
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }

  let raf = 0
  function loop(now) {
    if (visible && !document.hidden) draw(now)
    raf = requestAnimationFrame(loop)
  }

  resize()
  readPalette()
  if (reduced) draw(start + 6000)
  else raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    clearTimeout(mouse.idle)
    host.removeEventListener('pointermove', onMove)
    host.removeEventListener('pointerdown', onDown)
    window.removeEventListener('resize', resize)
    themeObserver.disconnect()
    io.disconnect()
  }
}
</script>

<template>
  <div ref="rootEl" class="noise-banner" aria-hidden="true">
    <canvas ref="canvasEl" class="noise-banner__canvas"></canvas>
    <div class="noise-banner__overlay"></div>
  </div>
</template>

<style scoped>
/* full-bleed cover band, same fade-into-page treatment as the repo cover */
.noise-banner {
  position: relative;
  height: clamp(150px, 18vw, 225px);
  overflow: hidden;
  /* fallback wash when WebGL is unavailable — same scheme as the shader bands */
  background:
    radial-gradient(60% 50% at 70% 40%, var(--noise-2), transparent 70%),
    radial-gradient(40% 40% at 20% 80%, var(--noise-3), transparent 70%),
    var(--noise-0);
}
.noise-banner__canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
}
.noise-banner__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 35%, var(--color-bg) 100%);
}
</style>
