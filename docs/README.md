# compilesave README

This is the README for your extension "compilesave". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

This extension uses a Python helper that calls the Google Gemini (GenAI) API. To enable the AI helper:

* Set the `GEMINI_API_KEY` environment variable (temporarily in terminal):

```bash
export GEMINI_API_KEY="your_api_key_here"
```

* Or add it to your development launcher at `.vscode/launch.json` under `env` (do NOT commit keys to source control):

```json
"env": {
  "GEMINI_API_KEY": "YOUR_API_KEY_HERE"
}
```

* Install the Python dependency (recommended in a virtualenv):

```bash
python3 -m pip install google-genai
```

If the environment variable or the `google-genai` package is not available, the extension falls back to an offline message explaining how to configure the API. The extension will prompt you and offer to open this README or your `launch.json` when it detects the offline fallback.

If you prefer not to use the Gemini API, the extension still provides quick-fix and terminal helpers but will show an offline notice when asked to explain an error.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Working with Markdown

You can author your README using Visual Studio Code.  Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux)
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux)
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
