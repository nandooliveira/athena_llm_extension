# Athena LLM

This extension is a LLM based code assistant designed to help collecting data in research related to the use of LLMs in programming assistance.

## Features

This extension provides inline completion suggestions based on the OpenAI Codex model or any other compatible API.

## Requirements

This extension requires an OpenAI API key. You can get one [here](https://beta.openai.com/).
This extension also requires an API to receive the developer's actions.

## Installation

1. Clone this repository `git clone git@github.com:nandooliveira/athena_llm.git`.
2. Get inside the cloned repository `cd athena_llm`.
3. Launch VSCode and access the Extensions view by clicking on the Extensions icon located in the Activity Bar on the left side of the window, or use the shortcut `Ctrl+Shift+X`.
4. In the Extensions pane, click on the `...` (More Actions) button at the top-right corner and select `Install from VSIX...`.
5. Navigate to the directory containing the cloned AthenaLLM repository, locate the `.vsix` file, and select it for installation.

## Extension Settings

```json
{
  "Athena LLM.apiAddress": "https://api.openai.com/v1/chat/completions",
  "Athena LLM.apiKey": "openai_api_key",
  "Athena LLM.contextSize": 3,
  "Athena LLM.enableTelemetry": true,
  "Athena LLM.maxTokens": 1000,
  "Athena LLM.model": "gpt-4",
  "Athena LLM.numberOfSuggestions": 3,
  "Athena LLM.serverAddress": "http://localhost:8000",
  "Athena LLM.temperature": 0.9
}
```

## Collected Events

|                 Event                 |                Description                 |
| ------------------------------------- | ------------------------------------------ |
| session/started                       | A new session was started                  |
| textDocument/didChange                | The document was changed                   |
| textDocument/inlineCompletionReceived | OpenAI returned suggestions                |
| textDocument/suggestionAccepted       | The developer accepted a suggestion        |
| textDocument/suggestionIgnored        | The developer have ignored the suggestions |
| textDocument/inlineCompletionAsked    | The extension asked suggestions to OpenAI  |
