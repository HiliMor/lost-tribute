// All the landmarks of the Island, built after the beach so they don't disturb its random layout.
import { createBeechcraft } from './beechcraft.js';
import { createBlackRock } from './black-rock.js';
import { createStatue } from './statue.js';
import { createTemple } from './temple.js';
import { createRadioTower } from './radio-tower.js';
import { createBarracks } from './barracks.js';
import { createLighthouse } from './lighthouse.js';
import { createHydra } from './hydra.js';
import { createDharmaStations } from './dharma-stations.js';
import { createStoryPlaces } from './story-places.js';

export function createLandmarks(scene) {
  createBeechcraft(scene);
  createBlackRock(scene);
  createStatue(scene);
  createTemple(scene);
  createRadioTower(scene);
  createBarracks(scene);
  const lighthouse = createLighthouse(scene);
  createHydra(scene);
  const lookingGlass = createDharmaStations(scene);
  createStoryPlaces(scene);
  return {
    update(dt, t) { lighthouse.update(dt); lookingGlass.update(t); },
  };
}
