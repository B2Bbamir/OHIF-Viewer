// import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
// vtkColorMaps.defaultBackgroundColormap = 'Grayscale';
// vtkColorMaps.defaultForegroundColormap = 'hsv';
// export default vtkColorMaps;
import vtkColorMaps from './ColorMapsList';

const presetMap = Object.create(null);

vtkColorMaps
  .filter((p) => p.RGBPoints)
  .filter((p) => p.ColorSpace !== 'CIELAB')
  .forEach((p) => {
    presetMap[p.Name] = p;
  });

// ----------------------------------------------------------------------------

const rgbPresetNames = Object.keys(presetMap);
rgbPresetNames.sort();

// ----------------------------------------------------------------------------

function getPresetByName(name) {
  return presetMap[name];
}

// ----------------------------------------------------------------------------

function addPreset(preset) {
  if (!preset.RGBPoints || preset.ColorSpace === 'CIELAB') {
    return;
  }

  if (!presetMap[preset.Name]) {
    rgbPresetNames.push(preset.Name);
    rgbPresetNames.sort();
  }

  presetMap[preset.Name] = preset;
}

// ----------------------------------------------------------------------------

function removePresetByName(name) {
  const index = rgbPresetNames.indexOf(name);
  if (index > -1) {
    rgbPresetNames.splice(index, 1);
  }
  delete presetMap[name];
}

// ----------------------------------------------------------------------------

const defaultBackgroundColormap = 'Grayscale';
const defaultForegroundColormap = 'Jet';

// ----------------------------------------------------------------------------

export default {
  addPreset,
  removePresetByName,
  getPresetByName,
  rgbPresetNames,
  defaultBackgroundColormap,
  defaultForegroundColormap
};
