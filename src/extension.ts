// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import OpenAI from "openai";

let timer: NodeJS.Timeout | null = null;
let lastTypedTime = Date.now();
let suggestedSnippets: string[] = [];

export function activate(context: vscode.ExtensionContext) {
  console.log("Extension Started");
  // Event handler for document changes
  vscode.workspace.onDidChangeTextDocument((e) => {
    lastTypedTime = Date.now();
    e.contentChanges.forEach(change => {
      if (suggestedSnippets.includes(change.text)) {
        console.log({
          suggestions: suggestedSnippets,
          accepted: change.text
        });
      }
    });



    // suggestedSnippets.includes(vscode.window.activeTextEditor?.document.getText())
  });

  const inlineCompletionProvider =
    vscode.languages.registerInlineCompletionItemProvider(
      { pattern: "**" },
      {
        async provideInlineCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position
        ) {
          if (timer) {
            clearTimeout(timer);
          }

          return new Promise<vscode.InlineCompletionItem[]>(
            async (resolve, _) => {
              timer = setTimeout(async () => {
                if (Date.now() - lastTypedTime >= 1000) {
                  const completionItems: vscode.InlineCompletionItem[] =
                    await fetchCompletionItems(document, position);

                  resolve(completionItems);
                } else {
                  resolve([]);
                }
              }, 1000);
            }
          );
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
  const startLine = Math.max(currentLine - 3, 0); // 3 lines before, or start of document
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

  suggestedSnippets = [];
  for (let i in choices) {
    const completion = choices[i].message.content?.trim() || "";
    const item = new vscode.InlineCompletionItem(
      completion,
      new vscode.Range(position, position)
    );

    suggestedSnippets.push(completion);
    completionItems.push(item);
  }

  return completionItems;
}

// This method is called when your extension is deactivated
export function deactivate() {}
