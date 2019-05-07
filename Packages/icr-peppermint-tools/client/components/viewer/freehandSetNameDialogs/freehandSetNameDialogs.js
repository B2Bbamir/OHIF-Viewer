import "./freehandSetNameDialogs.html";
import FreehandSetNameDialog from "./ReactComponents/FreehandSetNameDialog.js";

Template.freehandSetNameDialogs.onCreated(() => {
  const instance = Template.instance();

  // Used to remount component.
  instance.data.freehandSetNameDialogDefaultName = new ReactiveVar("");
  instance.data.freehandSetNameDialogCallback = new ReactiveVar(() => {
    return;
  });
});

Template.freehandSetNameDialogs.onRendered(() => {
  const instance = Template.instance();
  const id = "freehandSetNameDialog";

  const dialog = instance.$("#" + id);
  instance.data.dialog = dialog;

  dialogPolyfill.registerDialog(dialog.get(0));
});

Template.freehandSetNameDialogs.helpers({
  FreehandSetNameDialog() {
    return FreehandSetNameDialog;
  },
  defaultName() {
    const instance = Template.instance();

    return instance.data.freehandSetNameDialogDefaultName.get();
  },
  callback() {
    const instance = Template.instance();

    console.log(instance.data.freehandSetNameDialogCallback.get());

    return instance.data.freehandSetNameDialogCallback.get();
  }
});
