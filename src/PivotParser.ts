import { createToken, IToken, Lexer, TokenType } from "chevrotain";
import { v4 } from "uuid";

/**
 * calculated_field (not aggregated field)
 * aggregated_field
 * function (IF, CASE WHEN),
 * aggregation_function (SUM, COUNT),
 * dataset,
 * filters - WHERE HAVING,
 * selected_fields
 * single_select = field_name name | custom_field  | other field_name, function(function |field_name | custom_field), custom_field, agg_function(field_name)
 *
 * SELECT
 * product_and_Tax = field_1 * .75
 * select IF(field_1 * .75 > 1, true, false )
 * https://codesandbox.io/s/eval-tree-vl0yrc?file=/index.js
 * substitutions = [{field_name: product_and_tax_indicator, value: Ifunction: IF, arguments: (field_1 *.75 > 1)}]
 */

const TOKEN_TYPES = {
  OPERATOR: "OPERATOR",
  COMPARATOR: "COMPARATOR",
  ARGUMENT_START: "ARGUMENT_START",
  ARGUMENT_END: "ARGUMENT_END",
  SEPERATOR: "SEPERATOR",
  NUMBER: "NUMBER",
  WHITESPACE: "WHITESPACE",
  AGGREGATE_FUNCTION: "AGGREGATE_FUNCTION",
  FUNCTION: "FUNCTION",
  COLUMN: "COLUMN",
  GROUP_BY: "GROUP_BY"
};

const Operator: TokenType = createToken({
  name: TOKEN_TYPES.OPERATOR,
  pattern: /[*+-/]/
});

const Comparator: TokenType = createToken({
  name: TOKEN_TYPES.COMPARATOR,
  pattern: /(>=?)|(<=?)|(!=)|(==?)|(<>)/
});

const ArgumentStart: TokenType = createToken({
  name: TOKEN_TYPES.ARGUMENT_START,
  pattern: /[(]/
});

const ArgumentEnd: TokenType = createToken({
  name: TOKEN_TYPES.ARGUMENT_END,
  pattern: /[)]/
});

const Seperator: TokenType = createToken({
  name: TOKEN_TYPES.SEPERATOR,
  pattern: /[,]/
});

const AnyNumber: TokenType = createToken({
  name: TOKEN_TYPES.NUMBER,
  pattern: /-?\d+(\.\d+)?(e[+-]\d+)?/
});

const WhiteSpace: TokenType = createToken({
  name: TOKEN_TYPES.WHITESPACE,
  pattern: /\s+/
});

const AggregateFunction: TokenType = createToken({
  name: TOKEN_TYPES.AGGREGATE_FUNCTION,
  pattern: /(AVERAGE)|(COUNT)|(SUM)|(MEDIAN)|(MIN)|(MAX)/
});

const Function: TokenType = createToken({
  name: TOKEN_TYPES.FUNCTION,
  pattern: /(IFERROR)|(IF)/
});

export type APITokenData = {
  tokenType: string;
  tokenValue: string;
  arguments: APITokenData[];
};

interface TokenDataWithIds extends IToken {
  id: number;
  parent: number | null;
}

export class PivotParser {
  private parser: Lexer;
  private columns: string[] = [];
  private rows: string[] = [];
  private values: string[] = [];
  private readonly parentTokenTypes: string[] = [
    TOKEN_TYPES.FUNCTION,
    TOKEN_TYPES.AGGREGATE_FUNCTION
  ];
  private readonly tokensToIgnore: string[] = [
    TOKEN_TYPES.ARGUMENT_START,
    TOKEN_TYPES.ARGUMENT_END,
    TOKEN_TYPES.WHITESPACE
  ];

  constructor(columnNames: string[], rowNames: string[], valueNames: string[]) {
    this.generateTokenForDataColumns([
      ...columnNames,
      ...rowNames,
      ...valueNames
    ]);
    this.columns = columnNames;
    this.rows = rowNames;
    this.values = valueNames;
  }

  private prepareDataColumnsForRegExp(valueNames: string[]): string {
    return valueNames
      .map((name, i) => `(${name})${i !== valueNames.length - 1 ? "|" : ""}`)
      .join("");
  }

  public getRows(): string[] {
    return this.rows;
  }

  public getColumns(): string[] {
    return this.columns;
  }

  public getValues(): string[] {
    return this.values;
  }

  public updateRows(rowNames: string[]): void {
    this.rows = rowNames;
  }

  public updateColumns(columnNames: string[]): void {
    this.columns = columnNames;
  }

  public updateValues(valueNames: string[]): void {
    this.values = valueNames;
  }

  public generateTokenForDataColumns(dataColumns: string[]) {
    const regExp: RegExp = new RegExp(
      this.prepareDataColumnsForRegExp(dataColumns)
    );

    const Column: TokenType = createToken({
      name: TOKEN_TYPES.COLUMN,
      pattern: regExp
    });

    this.parser = new Lexer([
      Operator,
      Column,
      ArgumentStart,
      ArgumentEnd,
      Function,
      AggregateFunction,
      Comparator,
      AnyNumber,
      WhiteSpace,
      Seperator
    ]);
  }

  private gatherArgumentsForAPIToken(
    parentId: number | null,
    tokens: TokenDataWithIds[]
  ): APITokenData[] {
    return tokens
      .filter((token) => token.parent === parentId)
      .map((token) => ({
        tokenType: token.tokenType.name,
        tokenValue: token.image,
        arguments: this.parentTokenTypes.includes(token.tokenType.name)
          ? this.gatherArgumentsForAPIToken(token.id, tokens)
          : []
      }));
  }

  private generateAPIRequest(tokens: IToken[]): APITokenData[] {
    let currentParent = null;
    const tokensWithParents = [];

    tokens.forEach((token) => {
      const tokenId = v4();

      if (!this.tokensToIgnore.includes(token.tokenType.name)) {
        tokensWithParents.push({
          ...token,
          id: tokenId,
          parent: currentParent
        });
      }

      if (token.tokenType.name === TOKEN_TYPES.ARGUMENT_END) {
        const parentNode = tokensWithParents.find(
          (token) => token.id === currentParent
        );
        currentParent = parentNode?.parent || null;
      }

      if (this.parentTokenTypes.includes(token.tokenType.name)) {
        currentParent = tokenId;
      }
    });

    return this.gatherArgumentsForAPIToken(null, tokensWithParents);
  }

  public parseApiRequest(formula): APITokenData[] {
    const tokens = this.parser.tokenize(formula).tokens;
    return this.generateAPIRequest(tokens);
  }
}
