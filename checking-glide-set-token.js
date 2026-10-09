// Checking Glide — set GitHub token (one-time, Rev 22)
// Saves a fine-grained token (Contents: read on tie-ler/checking-glide) to the Keychain.
// Leave the field empty to remove it.
const KEY = "checking_glide_token"
const a = new Alert()
a.title = "Checking Glide token"
a.message = "Paste the GitHub token. Leave empty to remove it."
a.addSecureTextField("token", "")
a.addAction("Save")
a.addCancelAction("Cancel")
if (await a.presentAlert() !== -1) {
  const v = a.textFieldValue(0).trim()
  const done = new Alert()
  if (v) {
    Keychain.set(KEY, v)
    done.title = "Token saved"
  } else {
    if (Keychain.contains(KEY)) Keychain.remove(KEY)
    done.title = "Token removed"
  }
  done.addAction("OK")
  await done.presentAlert()
}
Script.complete()
