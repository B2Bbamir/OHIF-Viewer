/** @export @public @async
 * awaitConfirmationDialog - Awaits user input for confirmation.
 *
 * @return {Promise} A promise that resolves to true or false.
 */
export default async function (content) {

  function keyConfirmEventHandler (e) {
    console.log('keyConfirmEventHandler');

    if (e.which === 13) { // If Enter is pressed accept and close the dialog
      confirmEventHandler();
    }
  }

  function confirmEventHandler () {
    dialog.close();

    removeEventListeners();
    resolveRef(true);
  }

  function cancelEventHandler () {
    removeEventListeners();
    resolveRef(false);
  }

  function cancelClickEventHandler () {
    dialog.close();

    removeEventListeners();
    resolveRef(false);
  }

  function removeEventListeners() {
    dialog.removeEventListener('cancel', cancelEventHandler);
    cancel.removeEventListener('click', cancelClickEventHandler);
    dialog.removeEventListener('keydown', keyConfirmEventHandler);
    confirm.removeEventListener('click', confirmEventHandler);
  }

  const dialog = document.getElementById('ioConfirmationDialog');
  const ioConfirmationTitle = dialog.getElementsByClassName('io-confirmation-title')[0];
  const ioConfirmationBody = dialog.getElementsByClassName('io-confirmation-body')[0];
  const confirm = dialog.getElementsByClassName('js-io-confirmation-confirm')[0];
  const cancel = dialog.getElementsByClassName('js-io-confirmation-cancel')[0];

  // Add event listeners.
  dialog.addEventListener('cancel', cancelEventHandler);
  cancel.addEventListener('click', cancelClickEventHandler);
  dialog.addEventListener('keydown', keyConfirmEventHandler);
  confirm.addEventListener('click', confirmEventHandler);

  ioConfirmationTitle.textContent = content.title;
  ioConfirmationBody.textContent = content.body;

  dialog.showModal();

  // Reference to promise.resolve, so that I can use external handlers.
  let resolveRef;

  return new Promise(resolve => {
    resolveRef = resolve;
  });
}
