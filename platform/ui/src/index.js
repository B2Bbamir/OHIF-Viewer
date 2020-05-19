import {
  ContextMenu,
  Checkbox,
  CineDialog,
  ViewportDownloadForm,
  LayoutButton,
  LayoutChooser,
  MeasurementTable,
  MeasurementTableItem,
  Overlay,
  OverlayTrigger,
  PageToolbar,
  QuickSwitch,
  RoundedButtonGroup,
  SelectTree,
  SimpleDialog,
  StudyBrowser,
  StudyList,
  TableList,
  TableListItem,
  Thumbnail,
  TableSearchFilter,
  TablePagination,
  ToolbarSection,
  Tooltip,
  AboutContent,
  UserPreferences,
  UserPreferencesForm,
  OHIFModal,
} from './components';
import { useDebounce, useMedia } from './hooks';

// XNAT ICR
import ICRHelpContent from './components/content/icrHelpContent/ICRHelpContent';

// Elements
import {
  ICONS,
  Icon,
  DropdownMenu as Dropdown,
  Select,
  OldSelect,
  Label,
  Range,
  TextArea,
  TextInput,
} from './elements';

// Alias this for now as not all dependents are using strict versioning
import ExpandableToolMenu from './viewer/ExpandableToolMenu.js';
import PlayClipButton from './viewer/PlayClipButton.js';
import { ScrollableArea } from './ScrollableArea/ScrollableArea.js';
import Toolbar from './viewer/Toolbar.js';
import ToolbarButton from './viewer/ToolbarButton.js';
import ViewerbaseDragDropContext from './utils/viewerbaseDragDropContext.js';
import {
  SnackbarProvider,
  useSnackbarContext,
  withSnackbar,
  DialogProvider,
  useDialog,
  withDialog,
  ModalProvider,
  ModalConsumer,
  useModal,
  withModal,
} from './contextProviders';

export {
  // Elements
  ICONS,
  //
  Checkbox,
  Dropdown,
  Label,
  TextArea,
  TextInput,
  CineDialog,
  ContextMenu,
  ViewportDownloadForm,
  ExpandableToolMenu,
  Icon,
  LayoutButton,
  LayoutChooser,
  MeasurementTable,
  MeasurementTableItem,
  Overlay,
  OverlayTrigger,
  PlayClipButton,
  PageToolbar,
  QuickSwitch,
  Range,
  RoundedButtonGroup,
  ScrollableArea,
  Select,
  OldSelect,
  SelectTree,
  SimpleDialog,
  StudyBrowser,
  StudyList,
  TableList,
  TableListItem,
  Thumbnail,
  TableSearchFilter,
  TablePagination,
  Toolbar,
  ToolbarButton,
  ToolbarSection,
  Tooltip,
  AboutContent,
  UserPreferences,
  UserPreferencesForm,
  ViewerbaseDragDropContext,
  SnackbarProvider,
  useSnackbarContext,
  withSnackbar,
  ModalProvider,
  useModal,
  ModalConsumer,
  withModal,
  OHIFModal,
  DialogProvider,
  withDialog,
  useDialog,
  // Hooks
  useDebounce,
  useMedia,
  ICRHelpContent,
};
