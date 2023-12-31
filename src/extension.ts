// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import OpenAI from "openai";
import * as vscode from "vscode";
import guid from "./athena_llm/helpers/guid";

import { Completion } from "./athena_llm/models/completion";
import { EventService } from "./athena_llm/services/event";
import Config from "./athena_llm/services/config";

const eventService = new EventService();
let timer: NodeJS.Timeout | null = null;
let lastTypedTime = Date.now();
let lastSuggestions: string[] = [];
let lastPrompt: string = "";

let currentSession: string = guid();

enum ChangeType {
  insertion,
  deletion,
}
let lastChangeType: ChangeType;
let lastContentChanges: string[];

const DELAY_TO_ASK_SUGGESTION = 1000;

const getContext = (document: vscode.TextDocument, currentLine: number) => {
  const contextSize = Config.getContextSize();
  const startLine = Math.max(currentLine - contextSize, 0); // lines before, or start of document
  const endLine = Math.min(currentLine + contextSize, document.lineCount - 1); // lines after, or end of document

  let context = "";
  for (let i = startLine; i <= endLine; i++) {
    context += document.lineAt(i).text + "\n";
  }

  return context;
};

export function activate(context: vscode.ExtensionContext) {
  Config.askTelemetryPermissionOnFirstRun(context);

  // Event handler for document changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    lastTypedTime = Date.now();
    lastContentChanges = event.contentChanges.map((change) =>
      change.text.trim()
    );

    const currentLine: number = event.contentChanges[0].range.start.line || 0;
    // Do not register empty changes
    if (
      event.contentChanges.length === 0 ||
      getContext(event.document, currentLine).trim() === ""
    ) {
      lastChangeType = ChangeType.deletion;
      return;
    }

    lastChangeType = ChangeType.insertion;

    eventService.save({
      currentSession,
      type: "textDocument/didChange",
      createdAt: lastTypedTime,
      data: event,
    });

    lastContentChanges.forEach((change) => {
      lastSuggestions.includes(change);

      let anySuggestionAccepted = false;

      if (lastSuggestions.includes(change)) {
        eventService.save({
          currentSession,
          type: "textDocument/suggestionAccepted",
          createdAt: Date.now(),
          data: { ...event, suggestions: lastSuggestions, prompt: lastPrompt },
        });
        anySuggestionAccepted = true;
      }

      if (!anySuggestionAccepted) {
        eventService.save({
          currentSession,
          type: "textDocument/suggestionIgnored",
          createdAt: Date.now(),
          data: { ...event, suggestions: lastSuggestions, prompt: lastPrompt },
        });
        lastSuggestions = [];
      }
    });
  });

  const inlineCompletionProvider =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      {
        async provideInlineCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          context: vscode.InlineCompletionContext,
          token: vscode.CancellationToken
        ) {
          if (timer) {
            clearTimeout(timer);
          }

          return new Promise<vscode.InlineCompletionItem[]>(
            async (resolve, _) => {
              timer = setTimeout(async () => {
                if (
                  Date.now() - lastTypedTime >= DELAY_TO_ASK_SUGGESTION &&
                  lastChangeType === ChangeType.insertion &&
                  lastContentChanges.filter((value) =>
                    lastSuggestions.includes(value)
                  ).length === 0
                ) {
                  eventService.save({
                    currentSession,
                    type: "textDocument/inlineCompletionAsked",
                    createdAt: Date.now(),
                    data: { document, position, context, token },
                  });

                  const completionItems: vscode.InlineCompletionItem[] =
                    (await fetchCompletionItems(
                      document,
                      position,
                      context,
                      token
                    )) || [];

                  resolve(completionItems);
                } else {
                  lastSuggestions = [];
                  resolve([]);
                }
              }, DELAY_TO_ASK_SUGGESTION);
            }
          );
        },
      }
    );

  const command = "athena_llm.startNewSession";
  const commandHandler = async () => {
    const sessionName = await vscode.window.showInputBox({
      prompt: "Enter a name for the new session",
      placeHolder: "Subject 1",
    });

    if (sessionName && sessionName?.length > 0) {
      console.log("Starting new session: ", sessionName);
      currentSession = sessionName;
      eventService.save({
        currentSession,
        type: "session/start",
        createdAt: Date.now(),
        data: { sessionName },
      });
    }
  };

  context.subscriptions.push(
    vscode.commands.registerCommand(command, commandHandler)
  );
  context.subscriptions.push(inlineCompletionProvider);
}

async function fetchCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
) {
  const apiKey = Config.getApiKey();
  if ((!apiKey || apiKey === "") && Config.isTelemetryEnabled()) {
    Config.askApiKey();
    return;
  }

  const languageId = document.languageId;
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const codeContext = getContext(document, position.line);

  // const prompt = `Provide the ${languageId} code that completes the following statement: \n ${textToSend}`;
  const prompt = `Considering that:
  1) I need an answer that contains only code;
  2) The answer should have only the code completion, without the code snippet that I sent to you;
  3) You answer must have only the missing part of the code;

  Please provide de completion for the following ${languageId} function:
  ${codeContext} # Write the rest of the function here
  `;

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "assistant",
        content: prompt,
      },
    ],
    model: Config.getModel(),
    max_tokens: Config.getMaxTokens(),
    n: Config.getNumberOfSuggestions(),
    temperature: Config.getTemperature(),
  });

  const choices = response.choices || [];
  const completionItems: vscode.InlineCompletionItem[] = [];

  lastSuggestions = [];

  for (let i in choices) {
    const completion = Completion.from(
      choices[i].message.content?.trim() || "",
      codeContext,
      languageId
    );

    // also save the range to have a more precise idea of where the suggestion was made
    lastSuggestions.push(completion.getCode());

    const item = new vscode.InlineCompletionItem(
      completion.getCode(),
      new vscode.Range(position, position)
    );

    completionItems.push(item);
  }

  lastPrompt = prompt;
  eventService.save({
    currentSession,
    type: "textDocument/inlineCompletionReceived",
    createdAt: Date.now(),
    data: { document, position, context, token, prompt, completionItems },
  });

  return completionItems;
}

// This method is called when your extension is deactivated
export function deactivate() {}
