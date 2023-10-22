export class Completion {
  private code: string;

  private constructor(code: string) {
    this.code = code;
  }

  public static from(
    suggestion: string,
    sentContext: string,
    language: string
  ): Completion {
    let code = this.parseSuggestion(suggestion, sentContext, language);

    return new Completion(code);
  }

  public getCode(): string {
    return this.code;
  }

  private static parseSuggestion(
    suggestion: string,
    sentContext: string,
    language: string
  ): string {
    const codeBlock = this.extractCodeBlock(suggestion, language);

    return this.removeSentContext(codeBlock, sentContext);
  }

  private static extractCodeBlock(
    suggestion: string,
    language: string
  ): string {
    suggestion = suggestion.replace("```" + language, "```");

    const match = suggestion.match(/```([\s\S]*?)```/);

    return match ? match[1].trim() : suggestion;
  }

  private static removeSentContext(code: string, sentContext?: string): string {
    const lastNonEmptyLine = this.getLastNonEmptyLine(sentContext);

    return code.replace(lastNonEmptyLine, "").trim();
  }

  private static getLastNonEmptyLine(sentContext?: string) {
    if (sentContext) {
      return sentContext
        .split("\n")
        .reduceRight((acc, line) => acc || line.trim(), "");
    } else {
      return "";
    }
  }
}
