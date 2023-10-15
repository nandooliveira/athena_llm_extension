// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import OpenAI from "openai";
import * as vscode from "vscode";

import { EventService } from "./atena/services/event";

const eventService = new EventService();
let timer: NodeJS.Timeout | null = null;
let lastTypedTime = Date.now();

export function activate(context: vscode.ExtensionContext) {
  // Event handler for document changes
  vscode.workspace.onDidChangeTextDocument((event) => {
    lastTypedTime = Date.now();
    if (event.contentChanges.length === 0) {
      return;
    }

    eventService.save({
      type: "textDocument/didChange",
      createdAt: lastTypedTime,
      data: event
    });

    // TODO: If the change is in last suggestions, send a new suggestionAccepted event
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

          eventService.save({
            type: "textDocument/inlineCompletionAsked",
            createdAt: Date.now(),
            data: {document, position, context, token}
          });

          return new Promise<vscode.InlineCompletionItem[]>(async (resolve, _) => {
            // TODO: If the last change is in last suggestions, do not suggest again
            timer = setTimeout(async () => {
              if (Date.now() - lastTypedTime >= 2000) {
                const completionItems: vscode.InlineCompletionItem[] =
                  await fetchCompletionItems(document, position);

                  eventService.save({
                    type: "textDocument/inlineCompletionReceived",
                    createdAt: Date.now(),
                    data: {document, position, context, token, completionItems}
                  });

                resolve(completionItems);
              } else {
                resolve([]);
              }
            }, 2000);
          });
        },
      }
    );

  context.subscriptions.push(inlineCompletionProvider);
}

async function fetchCompletionItems(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  console.log("Requesting OpenAI");
  const languageId = document.languageId;
  const apiKey = "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";
  const openai = new OpenAI({
    apiKey: apiKey,
  });

  const currentLine = position.line;
  const startLine = Math.max(currentLine - 10, 0); // 3 lines before, or start of document
//   const endLine = Math.min(currentLine + 3, document.lineCount - 1); // 3 lines after, or end of document

  let textToSend = "";
  for (let i = startLine; i <= currentLine; i++) {
    textToSend += document.lineAt(i).text + "\n";
  }

  const response = await openai.chat.completions.create({
    messages: [
      {
        role: "assistant",
        content: `Provide the ${languageId} code that completes the following statement, the answer should contain only the code snippet: ${textToSend}`,
      },
    ],
    model: "gpt-4",
    max_tokens: 100,
    n: 3,
    temperature: 0.9,
  });

  const choices = response.choices || [];
  const completionItems: vscode.InlineCompletionItem[] = [];

  for (let i in choices) {
    const completion = choices[i].message.content?.trim() || "";
    const item = new vscode.InlineCompletionItem(
      completion,
      new vscode.Range(position, position)
    );

    completionItems.push(item);
  }

  return completionItems;
}

// This method is called when your extension is deactivated
export function deactivate() {}
