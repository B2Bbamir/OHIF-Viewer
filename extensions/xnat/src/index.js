import init from './init.js';
import commandsModule from './commandsModule.js';
import toolbarModule from './toolbarModule.js';
import panelModule from './panelModule.js';
import id from './id.js';

export default {
  /**
   * Only required property. Should be a unique value across all extensions.
   */
  id,

  /**
   *
   *
   * @param {object} [configuration={}]
   * @param {object|array} [configuration.csToolsConfig] - Passed directly to `initCornerstoneTools`
   */
  preRegistration({ servicesManager, configuration = {} }) {
    init({ servicesManager, configuration });
  },
  // getToolbarModule({ servicesManager }) {
  //   return toolbarModule;
  // },
  // getCommandsModule({ servicesManager }) {
  //   return commandsModule;
  // },
  getPanelModule({ servicesManager }) {
    return panelModule;
  },
};
