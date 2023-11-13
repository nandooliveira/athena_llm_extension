import * as vscode from "vscode";

export default class Config {
    static config: vscode.WorkspaceConfiguration =
    vscode.workspace.getConfiguration("atena");

    private static getConfigurationValue(configKey: string): string {
        return Config.config.get(configKey) || "";
    }

    static getApiKey(): string {
        return Config.getConfigurationValue("apiKey");
    }

    static setApiKey(inputValue: string): void {
        Config.config.update("apiKey", inputValue, true);
    }

    static getModel(): string {
        return Config.getConfigurationValue("openAIModel");
    }

    static setUserConsent(consent: boolean): void {
        Config.config.update("enableTelemetry", consent, true);
    }

    static isTelemetryEnabled(): string {
        return Config.getConfigurationValue("enableTelemetry");
    }

    static askTelemetryPermissionOnFirstRun(
        context: vscode.ExtensionContext
        ): void {
            const isFirstRunKey = "isFirstRun";
            const globalState = context.globalState;
            // globalState.update(isFirstRunKey, false);
            const isFirstRun = Boolean(globalState.get(isFirstRunKey));

            if (!isFirstRun) {
                // mark extension as already started
                globalState.update(isFirstRunKey, true);

                // Ask permission to the user
                vscode.window
                .showInformationMessage(
                    "Do you allow this extension to collect usage data?",
                    "Yes",
                    "No"
                    )
                    .then((selection) => {
                        Config.setUserConsent(selection === "Yes");
                    });
                }
            }

            static askApiKey(): void {
                const apiKey = Config.getApiKey();

                if (!apiKey || apiKey === "") {
                    vscode.window
                    .showInputBox({
                        prompt: "Please enter your OpenAI Api Key.",
                    })
                    .then((inputValue) => {
                        // Handle the input value
                        Config.setApiKey(inputValue || "");
                    });
                }
            }
        }
