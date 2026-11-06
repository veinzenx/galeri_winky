import { useEffect, useRef } from "react";

const vertexShaderSource = `
  attribute vec2 position;
  varying vec2 uv;

  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const fragmentShaderSource = `
  precision highp float;
  uniform sampler2D globeTexture;
  uniform vec2 rotation;
  varying vec2 uv;

  void main() {
    vec2 point = uv * 2.0 - 1.0;
    float radiusSquared = dot(point, point);
    if (radiusSquared > 1.0) discard;

    vec3 normal = normalize(vec3(point.x, -point.y, sqrt(1.0 - radiusSquared)));
    float yaw = rotation.x;
    float pitch = rotation.y;
    normal = vec3(
      cos(yaw) * normal.x + sin(yaw) * normal.z,
      normal.y,
      -sin(yaw) * normal.x + cos(yaw) * normal.z
    );
    normal = vec3(
      normal.x,
      cos(pitch) * normal.y - sin(pitch) * normal.z,
      sin(pitch) * normal.y + cos(pitch) * normal.z
    );

    float longitude = atan(normal.z, normal.x) / 6.28318530718 + 0.5;
    float latitude = asin(clamp(normal.y, -1.0, 1.0)) / 3.14159265359 + 0.5;
    vec3 surface = texture2D(globeTexture, vec2(longitude, latitude)).rgb;

    vec3 lightDirection = normalize(vec3(-0.48, 0.52, 0.78));
    float diffuse = dot(normal, lightDirection);
    float daylight = smoothstep(-0.12, 0.12, diffuse);
    float illumination = mix(0.11, 1.0, daylight);
    vec3 viewDirection = vec3(0.0, 0.0, 1.0);
    float specular = pow(max(dot(reflect(-lightDirection, normal), viewDirection), 0.0), 36.0) * daylight;
    float rim = pow(1.0 - max(normal.z, 0.0), 2.4);
    vec3 color = surface * illumination
      + vec3(0.48, 0.78, 1.0) * rim * mix(0.04, 0.2, daylight)
      + vec3(1.0) * specular * 0.42;
    float edge = smoothstep(0.0, 0.025, 1.0 - radiusSquared);

    gl_FragColor = vec4(color, edge);
  }
`;

const continentPaths = [
  "M37 78 53 60 81 53 96 62 111 59 124 72 140 76 150 91 142 105 127 111 119 128 103 133 98 151 85 163 75 153 72 136 59 129 54 113 43 106 31 91Z",
  "m125 165 17 7 11 18-3 19 10 18-8 22-12 21-10 27-12 12-9-18 2-23-9-19 4-23-9-18 10-19Z",
  "m164 56 13-9 13 5 5 12-10 9-14-4Z",
  "m179 90 23-10 28 3 12 13 20 1 11 13-9 13-23-2-9 13-18-3-7 12-14-9-17 1-8-16-14-4 3-17Z",
  "m225 145 18-10 21 5 17 19-4 23-12 17-8 24-14 17-13-10-4-22-12-17-2-23-12-12Z",
  "m266 72 13-13 18 2 7 14-9 10-20-2Z",
  "m283 104 25-12 26 6 13 14 22 5 8 15-15 12-23-5-17 11-21-9-17 2-10-16-17-4Z",
  "m320 164 17-9 20 6 14 18-7 20-12 14-5 25-12 24-13 7-8-20 1-23-9-18 4-20-7-13Z",
  "m347 73 18-10 19 6 4 14-16 9-19-5Z",
  "m360 110 17-8 15 7-4 12-19 3Z",
];

function createMapTexture(gl, texture, themeElement) {
  let currentImage;
  let currentUrl;
  let moodTimer = 0;

  function loadTexture() {
    currentImage?.removeAttribute("src");
    if (currentUrl) URL.revokeObjectURL(currentUrl);

    const theme = getComputedStyle(themeElement);
    const landColor = theme.getPropertyValue("--planet-cloud").trim() || "#a7df9c";
    const lightColor = theme.getPropertyValue("--planet-light").trim() || "#e2fffc";
    const midColor = theme.getPropertyValue("--planet-mid").trim() || "#48d8d1";
    const deepColor = theme.getPropertyValue("--planet-deep").trim() || "#177fbd";
    const mapSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="360" viewBox="0 0 720 360">
      <g fill="${landColor}" stroke="${lightColor}" stroke-opacity=".45" stroke-width="1.5">
        ${[0, 360].map(offset => `<g transform="translate(${offset} 0)">${continentPaths.map(path => `<path d="${path}"/>`).join("")}</g>`).join("")}
      </g>
    </svg>`;
    const image = new Image();
    const objectUrl = URL.createObjectURL(new Blob([mapSvg], { type: "image/svg+xml" }));
    currentImage = image;
    currentUrl = objectUrl;

    image.onload = () => {
    if (currentImage !== image) return;
    const mapCanvas = document.createElement("canvas");
    mapCanvas.width = 1024;
    mapCanvas.height = 512;
    const context = mapCanvas.getContext("2d");
    if (!context) {
      console.error("Canvas 2D tidak tersedia untuk menyiapkan tekstur globe.");
      URL.revokeObjectURL(objectUrl);
      return;
    }

    const ocean = context.createLinearGradient(0, 0, 1024, 512);
    ocean.addColorStop(0, lightColor);
    ocean.addColorStop(0.48, midColor);
    ocean.addColorStop(1, deepColor);
    context.fillStyle = ocean;
    context.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
    context.drawImage(image, 0, 0, mapCanvas.width, mapCanvas.height);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, mapCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    URL.revokeObjectURL(objectUrl);
    currentUrl = null;
    };
    image.onerror = () => {
    if (currentImage !== image) return;
    console.error("Tekstur benua untuk globe gagal dimuat.");
    URL.revokeObjectURL(objectUrl);
    currentUrl = null;
    };
    image.src = objectUrl;
  }

  const moodObserver = new MutationObserver(() => {
    window.clearTimeout(moodTimer);
    moodTimer = window.setTimeout(loadTexture, 1250);
  });
  moodObserver.observe(themeElement, { attributes: true, attributeFilter: ["data-mood"] });
  loadTexture();

  return () => {
    moodObserver.disconnect();
    window.clearTimeout(moodTimer);
    if (currentImage) {
      currentImage.onload = null;
      currentImage.onerror = null;
      currentImage.removeAttribute("src");
    }
    if (currentUrl) URL.revokeObjectURL(currentUrl);
  };
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Shader WebGL tidak dapat dibuat.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader globe gagal dikompilasi: ${message}`);
  }
  return shader;
}

export default function PlanetGlobe() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    const gl = canvas?.getContext("webgl", { alpha: true, antialias: true });
    if (!canvas || !container || !gl) {
      console.error("WebGL tidak tersedia; planet 3D tidak dapat ditampilkan.");
      return undefined;
    }

    let program;
    let animationFrame = 0;
    let previousTime = 0;
    let yaw = 0;
    let pitch = 0;
    let pointerYaw = 0;
    let pointerPitch = 0;
    let targetPointerYaw = 0;
    let targetPointerPitch = 0;
    let lastPointerRotation = "";
    let disposed = false;
    let disposeTexture = () => {};
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
      const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
      program = gl.createProgram();
      if (!program) throw new Error("Program WebGL globe tidak dapat dibuat.");
      gl.attachShader(program, vertexShader);
      gl.attachShader(program, fragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(vertexShader);
      gl.deleteShader(fragmentShader);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(`Program globe gagal ditautkan: ${gl.getProgramInfoLog(program)}`);
      }

      const buffer = gl.createBuffer();
      if (!buffer) throw new Error("Buffer WebGL globe tidak dapat dibuat.");
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
        gl.STATIC_DRAW,
      );
      gl.useProgram(program);
      const position = gl.getAttribLocation(program, "position");
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

      const texture = gl.createTexture();
      if (!texture) throw new Error("Tekstur WebGL globe tidak dapat dibuat.");
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([40, 123, 158, 255]),
      );
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      disposeTexture = createMapTexture(gl, texture, container.closest(".wrapper") || container);

      const rotationLocation = gl.getUniformLocation(program, "rotation");
      const resizeObserver = new ResizeObserver(() => {
        const bounds = canvas.getBoundingClientRect();
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.max(1, Math.round(bounds.width * pixelRatio));
        canvas.height = Math.max(1, Math.round(bounds.height * pixelRatio));
        gl.viewport(0, 0, canvas.width, canvas.height);
      });
      resizeObserver.observe(canvas);

      function render(time) {
        if (disposed) return;
        const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0;
        const smoothing = 1 - Math.exp(-delta * 10);
        previousTime = time;
        if (!reduceMotion) {
          yaw += delta * 0.24;
          pitch += delta * 0.13;
        }

        const rotation = `${container.style.getPropertyValue("--planet-rotate-x")}|${container.style.getPropertyValue("--planet-rotate-y")}`;
        if (rotation !== lastPointerRotation) {
          lastPointerRotation = rotation;
          targetPointerPitch = (parseFloat(container.style.getPropertyValue("--planet-rotate-x")) || 0) * Math.PI / 180;
          targetPointerYaw = (parseFloat(container.style.getPropertyValue("--planet-rotate-y")) || 0) * Math.PI / 180;
        }
        pointerYaw += (targetPointerYaw - pointerYaw) * smoothing;
        pointerPitch += (targetPointerPitch - pointerPitch) * smoothing;

        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(
          rotationLocation,
          yaw + pointerYaw,
          pitch + pointerPitch + (reduceMotion ? 0 : Math.sin(time * 0.00022) * 0.12),
        );
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        if (!reduceMotion) animationFrame = window.requestAnimationFrame(render);
      }

      animationFrame = window.requestAnimationFrame(render);
      return () => {
        disposed = true;
        window.cancelAnimationFrame(animationFrame);
        resizeObserver.disconnect();
        disposeTexture();
        gl.deleteTexture(texture);
        gl.deleteBuffer(buffer);
        gl.deleteProgram(program);
      };
    } catch (error) {
      console.error("Globe 3D gagal diinisialisasi.", error);
      disposeTexture();
      if (program) gl.deleteProgram(program);
      return undefined;
    }
  }, []);

  return <canvas ref={canvasRef} className="planet-webgl" aria-hidden="true" />;
}
