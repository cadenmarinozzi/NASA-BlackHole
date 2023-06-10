export default `
  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform vec3 uCamPos;
  uniform vec3 uBlackHolePos;
  uniform vec3 uRotation;

  #define MAX_ITERATIONS 2000
  #define STEP_SIZE 0.02
  #define PI 3.1415926535897932384626433832795
  #define TAU 6.283185307179586476925286766559

  float innerDiskRadius = 2.5;
  float outerDiskRadius = 7.0;
  float diskTwist = 10.0;
  float flowRate = 0.6;

  vec3 rotate(vec3 v, vec3 angle) {
    float x = v.x;
    float y = v.y;
    float z = v.z;

    float cx = cos(angle.x);
    float cy = cos(angle.y);
    float cz = cos(angle.z);

    float sx = sin(angle.x);
    float sy = sin(angle.y);
    float sz = sin(angle.z);

    float nx = cy * (sz * y + cz * x) - sy * z;
    float ny = sx * (cy * z + sy * (sz * y + cz * x)) + cx * (cz * y - sz * x);
    float nz = cx * (cy * z + sy * (sz * y + cz * x)) - sx * (cz * y - sz * x);

    return vec3(nx, ny, nz);
}

  float hash(float n) { 
    return fract(sin(n) * 753.5453123); 
  }

  float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n = p.x + p.y * 157.0 + 113.0 * p.z;

      return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
          mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
          mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
  }

  // https://iquilezles.org/articles/fbm/
  float fbm(vec3 pos, const int numOctaves, const float iterScale, const float detail, const float weight) {
      float mul = weight;
      float add = 1.0 - 0.5 * mul;
      float t = noise(pos) * mul + add;

      for (int i = 1; i < numOctaves; ++i) {
          pos *= iterScale;
          mul = exp2(log2(weight) - float(i) / detail);
          add = 1.0 - 0.5 * mul;
          t *= noise(pos) * mul + add;
      }
      
      return t;
  }

  vec4 raytrace(vec3 rayDir, vec3 rayPos) {
    vec4 color = vec4(0);
    float h2 = pow(length(cross(rayPos, rayDir)), 2.0);
    float deltaDiskRadius = outerDiskRadius - innerDiskRadius;
    float flowToDisk = (flowRate / TAU / deltaDiskRadius);

    for (int i = 0; i < MAX_ITERATIONS; i++) {
        float dist = length(rayPos);

        if (dist < 1.0) {
          return color;
        }

        rayDir += -1.5 * h2 * rayPos / pow(pow(dist, 2.0), 2.5) * STEP_SIZE;  
        vec3 steppedRayPos = rayPos + rayDir * STEP_SIZE;


        float diskDist = dist - innerDiskRadius;

        vec3 uvw = vec3(
          (atan(steppedRayPos.z, abs(steppedRayPos.x)) / TAU) - (diskTwist / sqrt(dist)), 
          pow(diskDist / deltaDiskRadius, 2.0) + flowToDisk, 
          steppedRayPos.y * 0.5 + 0.5
        );

        float diskDensity = 1.0 - length(steppedRayPos / vec3(outerDiskRadius, 1.0, outerDiskRadius));
        diskDensity *= smoothstep(innerDiskRadius, innerDiskRadius + 1.0, dist);

        float densityVariation = fbm(uvw - 0.5, 5, 2.0, 1.0, 7.0);
        diskDensity *= densityVariation * pow(inversesqrt(dist), 2.0) + 0.5 * fbm(rotate(rayPos, vec3(0, -uTime * inversesqrt(pow(diskDist, 2.0)) * 2.0, 0)), 5, 5.0, 0.1, 0.5); 

        float opticalDepth = STEP_SIZE * 50.0 * diskDensity;

        if (dist > innerDiskRadius && dist < outerDiskRadius && rayPos.y * steppedRayPos.y < pow(STEP_SIZE, 3.0)) {
          vec3 shiftVector = 0.6 * cross(normalize(steppedRayPos), vec3(0.0, 1.0, 0.0));
          float velocity = dot(rayDir, shiftVector);
          
          float dopplerShift = sqrt((1.0 - velocity) / (1.0 + velocity)); 
          float gravitationalShift = sqrt((1.0 - 2.0 / dist) / (1.0 - 2.0 / length(uCamPos)));

          return vec4(vec3(1, 0.25, 0) * gravitationalShift * dopplerShift * opticalDepth, 1.0);
        }
      
        rayPos = steppedRayPos;
    }

    return color;
  }
  
  void main() {
    vec2 uv = (vUv - 0.5) * 2.0 * vec2(uResolution.x / uResolution.y, 1);
    
    vec3 rayDir = rotate( normalize(vec3(uv, 1)), uRotation);
    vec3 rayPos = rotate(uCamPos, uRotation);

    vec4 color = raytrace(rayDir, rayPos);
    gl_FragColor = color;
  }
`;
