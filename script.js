import * as THREE from "three";
import vertexShader from "vertexShader";
import fragmentShader from "fragmentShader";

const scene = new THREE.Scene();

const width = 5120 / 2;
const height = 2880 / 2;
const aspectRatio = width / height;

const camera = new THREE.PerspectiveCamera(75, aspectRatio, 0.1, 1000);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
});
renderer.setSize(width, height);
renderer.setPixelRatio(window.devicePixelRatio);

document.body.appendChild(renderer.domElement);

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

const fovRadians = degToRad(camera.fov);
const yFov = camera.position.z * Math.tan(fovRadians / 2) * 2;

const canvasGeometry = new THREE.PlaneGeometry(yFov * camera.aspect, yFov);

const canvasMaterial = new THREE.ShaderMaterial({
  uniforms: {
    uResolution: {
      value: new THREE.Vector2(width, height),
    },
    uTime: {
      value: 0,
    },
    uCamPos: {
      value: new THREE.Vector3(0, 0, -10),
    },
    uBlackHolePos: {
      value: new THREE.Vector3(0, 0, 0),
    },
    uRotation: {
      value: new THREE.Vector3(degToRad(-4), 0, 0),
    },
  },
  vertexShader,
  fragmentShader,
});

const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);
scene.add(canvasMesh);

let frames = [];
let frameTimes = 0;
const N = 1;

for (let i = 0; i < N; i++) {
  const startTime = performance.now();
  renderer.render(scene, camera);

  canvasMaterial.uniforms.uTime.value = i / 10;

  const data = renderer.domElement.toDataURL("image/png");
  frames.push(data);

  const endTime = performance.now();
  const frameTime = endTime - startTime;
  frameTimes += frameTime;

  console.log(`Finished rendering frame: ${i} frame time: ${frameTime}ms`);
}

console.log(`Average frame time: ${frameTimes / N}ms`);

let image = document.createElement("img");
document.body.appendChild(image);

image.style.width = width + "px";
image.style.height = height + "px";

let i = 0;

setInterval(() => {
  const frame = frames[i];
  image.src = frame;
  i++;

  if (i === frames.length) {
    i = 0;
  }
}, 50);
