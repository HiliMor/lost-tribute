// Post-processing: bloom, vignette, film grain and the violet tint of a Swan discharge.
import * as THREE from 'three/webgpu';
import { vec2, vec3, vec4, mix, smoothstep, length, pass, screenUV, mx_noise_float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { uT, uDis } from '../core/uniforms.js';

export function createPostProcessing(renderer, scene, camera) {
  const pipeline = new THREE.RenderPipeline(renderer);
  const scenePass = pass(scene, camera);
  const sceneColor = scenePass.getTextureNode('output');
  const bloomPass = bloom(sceneColor, 0.24, 0.5, 0.9);
  const vignette = smoothstep(0.25, 1.05, length(screenUV.sub(0.5)).mul(1.45)).oneMinus();
  const grain = mx_noise_float(vec3(screenUV.mul(vec2(1100.0, 680.0)), uT.mul(24.0))).mul(0.018);
  const graded = sceneColor.rgb.add(bloomPass.rgb);
  const discharged = mix(graded, graded.mul(vec3(0.9, 0.6, 1.25)).add(vec3(0.06, 0.02, 0.12)), uDis);
  pipeline.outputNode = vec4(discharged.mul(vignette.mul(0.55).add(0.45)).add(grain), 1.0);
  return pipeline;
}
