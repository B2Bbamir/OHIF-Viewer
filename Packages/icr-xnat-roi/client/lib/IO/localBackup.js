import { SeriesInfoProvider } from 'meteor/icr:series-info-provider';
import { cornerstoneTools } from 'meteor/ohif:cornerstone';
import { OHIF } from 'meteor/ohif:core';
import { Polygon } from '../classes/Polygon.js';
import { getNextColor } from 'meteor/icr:peppermint-tools';

import { db } from './indexedDB.js';

const globalToolStateManager = cornerstoneTools.globalImageIdSpecificToolStateManager;

const modules = cornerstoneTools.store.modules;

export default {
  saveBackUpForActiveSeries,
  loadBackupData
};


function loadBackupData() {
  const toolStateManager = globalToolStateManager.saveToolState();

  console.log(toolStateManager);

  const studies = OHIF.viewer.StudyMetadataList.all();

  console.log(studies);

  // Loop through studies to find the series
  for ( let i = 0; i < studies.length; i++ ) {
    const displaySets = studies[i].getDisplaySets();

    for (let j = 0; j < displaySets.length; j++) {
      _loadDataIfDisplaySetHasBackup(displaySets[i]);
    }

  }
}


function _loadDataIfDisplaySetHasBackup (displaySet) {
  const seriesInstanceUid = displaySet.seriesInstanceUid;
  const images = displaySet.images;
  const toolStateManager = globalToolStateManager.saveToolState();

  console.log(seriesInstanceUid);

  console.log(displaySet)

  // open a read/write db transaction, ready for adding the data
  let transaction = db.transaction(['XNAT_OHIF_BACKUP'], 'readonly');

  // call an object store that's already been added to the database
  let objectStore = transaction.objectStore('XNAT_OHIF_BACKUP');

  // Make a request to GET our newItem object to the object store
  var request = objectStore.get(generateHashCode(seriesInstanceUid));

  request.onsuccess = function() {
    if (!request.result) {
      return;
    }

    console.log('Found backup data');

    const data = JSON.parse(request.result.dataDump);

    if (data.freehandMouse) {
      loadFreehandMouseData(
        data.freehandMouse,
        seriesInstanceUid,
        images
      );
    }

    if (data.brush) {
      loadBrushData(
        data.brush,
        seriesInstanceUid,
        images
      );
    }
  };


}

function loadFreehandMouseData (freehandMouseData, seriesInstanceUid, images) {
  const { metadata, toolState } = freehandMouseData;

  loadFreehandMouseMetadata(metadata, seriesInstanceUid);
  loadFreehandMouseToolState(toolState, seriesInstanceUid, images);
}

function loadBrushData (brushData, seriesInstanceUid, images) {

  const { metadata, toolState } = brushData;

  loadBrushMetadata(metadata, seriesInstanceUid);
  loadBrushToolState(toolState, seriesInstanceUid, images);

}

function loadFreehandMouseMetadata (metadata, seriesInstanceUid) {
  modules.freehand3D.setters.structureSet(
    seriesInstanceUid,
    metadata.name,
    {
      uid: metadata.uid,
      activeROIContourIndex: 0
    }
  );

  const ROIContourCollection = metadata.ROIContourCollection;

  for (let i = 0; i < ROIContourCollection.length; i++) {
    // Incremenet color so that next drawn ROI will be the correct color.
    getNextColor();
    modules.freehand3D.setters.ROIContour(
      seriesInstanceUid,
      metadata.uid,
      ROIContourCollection[i].name,
      {
        color: ROIContourCollection[i].color,
        uid: ROIContourCollection[i].uid,
        polygonCount: ROIContourCollection[i].polygonCount
      }
    );
  }
}

function loadFreehandMouseToolState (toolState, seriesInstanceUid, images) {
  const toolStateManager = globalToolStateManager.saveToolState();

  for (let i = 0; i < images.length; i++) {
    if (!toolState[i]) {
      continue;
    }

    const imageId = images[i]._imageId;
    const sopInstanceUid = images[i]._sopInstanceUID;

    prepareToolStateManager(toolStateManager, imageId, 'freehandMouse');

    const toolStateManagerFreehandData = toolStateManager[imageId].freehandMouse.data;

    // Add each polygon.
    const freehandToolData = toolState[i];

    for (let j = 0; j < freehandToolData.length; j++) {
      const toolData = freehandToolData[j];
      const polygon = new Polygon(
        toolData.handles,
        sopInstanceUid,
        seriesInstanceUid,
        'DEFAULT',
        toolData.ROIContourUid,
        toolData.uid,
        1
      );

      toolStateManagerFreehandData.push(
        polygon.getFreehandToolData()
      );
    }
  }
}

function loadBrushMetadata (metadata, seriesInstanceUid) {
  modules.brush.state.segmentationMetadata[seriesInstanceUid] = metadata;
}

function loadBrushToolState (toolState, seriesInstanceUid, images) {
  const toolStateManager = globalToolStateManager.saveToolState();

  for (let i = 0; i < images.length; i++) {
    if (!toolState[i]) {
      continue;
    }

    const imageId = images[i]._imageId;

    prepareToolStateManager(toolStateManager, imageId, 'brush');

    const toolStateManagerBrushData = toolStateManager[imageId].brush.data;

    // Add each segmentation
    const brushToolData = toolState[i];

    for (let j = 0; j < brushToolData.length; j++) {
      const toolData = brushToolData[j];

      if (toolData) {
        const length = Object.keys(toolData).length
        const pixelData = new Uint8ClampedArray(length);

        for (let k = 0; k < length; k++) {
          pixelData[k] = toolData[k]
        }

        toolStateManagerBrushData.push({
          pixelData,
          invalidated: true
        });
      } else {
        toolStateManagerBrushData.push({});
      }
    }
  }
}

function prepareToolStateManager (toolStateManager, imageId, toolType) {
  if (!toolStateManager[imageId]) {
    toolStateManager[imageId] = {};
    toolStateManager[imageId][toolType] = {};
    toolStateManager[imageId][toolType].data = [];
  } else if (!toolStateManager[imageId][toolType]) {
    toolStateManager[imageId][toolType] = {};
    toolStateManager[imageId][toolType].data = [];
  } else if (!toolStateManager[imageId][toolType].data) {
    toolStateManager[imageId][toolType].data = [];
  }
}



function saveBackUpForActiveSeries() {
  const seriesInstanceUid = SeriesInfoProvider.getActiveSeriesInstanceUid();
  const activeEnabledElement = OHIF.viewerbase.viewportUtils.getEnabledElementForActiveElement();
  const element = activeEnabledElement.element;
  const stackToolState = cornerstoneTools.getToolState(element, 'stack');
  const imageIds = stackToolState.data[0].imageIds;
  const toolStateManager = globalToolStateManager.saveToolState();

  console.log(toolStateManager);

  const brushToolState = {};
  const freehandMouseToolState = {};

  // Aggregate toolState
  for (let i = 0; i < imageIds.length; i++) {
    const imageToolState = toolStateManager[imageIds[i]];

    if (!imageToolState) {
      continue;
    }

    if (imageToolState.brush) {
      brushToolState[i] = createBrushObjectForFrame(imageToolState.brush);
    }

    if (imageToolState.freehandMouse) {
      freehandMouseToolState[i] = createFreehandMouseObjectForFrame(imageToolState.freehandMouse);
      //freehandMouseToolState[i] = imageToolState.freehandMouse;
    }
  }

  const dataDump = {};

  const brushMetadata = modules.brush.state.segmentationMetadata[seriesInstanceUid];

  if (brushMetadata) {
    dataDump.brush = {};
    dataDump.brush.metadata = brushMetadata;
    dataDump.brush.toolState = brushToolState;
  }

  // Get DEFAULT (i.e. working) structureSet.
  const freehandMouseMetadata = modules.freehand3D.getters.structureSet(seriesInstanceUid);

  if (freehandMouseMetadata) {
    dataDump.freehandMouse = {};
    dataDump.freehandMouse.metadata = freehandMouseMetadata;
    dataDump.freehandMouse.toolState = freehandMouseToolState;
  }

  console.log(dataDump.brush);

  if (dataDump.brush || dataDump.freehandMouse) {
    // Save data
    let newItem = {
      seriesInstanceUid: generateHashCode(seriesInstanceUid),
      dataDump: JSON.stringify(dataDump)
    };

    // open a read/write db transaction, ready for adding the data
    let transaction = db.transaction(['XNAT_OHIF_BACKUP'], 'readwrite');

    // call an object store that's already been added to the database
    let objectStore = transaction.objectStore('XNAT_OHIF_BACKUP');

    // Make a request to PUT our newItem object to the object store
    var request = objectStore.put(newItem);


    // Report on the success of the transaction completing, when everything is done
    transaction.oncomplete = function() {
      console.log('Transaction completed: database modification finished.');
    };

    transaction.onerror = function() {
      console.log('Transaction not completed due to error');
    };
  }
}


function createFreehandMouseObjectForFrame (freehandMouseToolStateI) {
  console.log(freehandMouseToolStateI);
  const data = freehandMouseToolStateI.data;

  const freehandMouseObjectForFrame = [];

  for (let i = 0; i < data.length; i++) {
    const handles = [];
    const dataI = data[i];

    // Only hoover up working ROICollection data.
    if (dataI.structureSetUid !== 'DEFAULT') {
      continue;
    }

    for (let j = 0; j < dataI.handles.length; j++) {
      handles.push({
        x: dataI.handles[j].x,
        y: dataI.handles[j].y
      });
    }

    freehandMouseObjectForFrame.push({
      uid: dataI.uid,
      handles,
      // Deliberately don't store the seriesInstanceUid.
      // structureSetUid will just be DEFAULT
      ROIContourUid: dataI.ROIContourUid
    });
  }

  return freehandMouseObjectForFrame;
}

function createBrushObjectForFrame (brushMouseToolStateI) {
  console.log(brushMouseToolStateI);
  const data = brushMouseToolStateI.data;

  const brushObjectForFrame = [];

  for (let i = 0; i < data.length; i++) {
    brushObjectForFrame.push(
      data[i].pixelData
    );
  }

  return brushObjectForFrame;
}


/**
 * hash - credit: https://github.com/mstdokumaci/string-hash-64 MIT Licensed.
 *
 * @param  {string} str The string to generate a hashcode from.
 * @return {number}     The hash code.
 */
function generateHashCode (str) {
  var i = str.length
  var hash1 = 5381
  var hash2 = 52711

  while (i--) {
    const char = str.charCodeAt(i)
    hash1 = (hash1 * 33) ^ char
    hash2 = (hash2 * 33) ^ char
  }

  return (hash1 >>> 0) * 4096 + (hash2 >>> 0)
}
