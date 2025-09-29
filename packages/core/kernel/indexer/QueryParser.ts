/**
 * QueryParser.ts
 * ---------------------------------------------------------------------------
 * Parseur de requêtes FTS avancé supportant:
 * - Opérateurs AND/OR explicites
 * - Recherche de phrases avec guillemets
 * - Groupement avec parenthèses
 * - Préparation pour highlight avec positions
 */

export type QueryOperator = 'AND' | 'OR';
export type QueryNodeType = 'term' | 'phrase' | 'group' | 'operator';

export interface QueryTerm {
  type: 'term';
  value: string;
  positions?: number[]; // positions dans le texte original pour highlight
}

export interface QueryPhrase {
  type: 'phrase';
  value: string; // phrase complète sans guillemets
  terms: string[]; // termes individuels de la phrase
  positions?: number[]; // positions de début de phrase
}

export interface QueryGroup {
  type: 'group';
  nodes: QueryNode[];
  operator: QueryOperator; // opérateur par défaut dans le groupe
}

export interface QueryOperatorNode {
  type: 'operator';
  operator: QueryOperator;
}

export type QueryNode = QueryTerm | QueryPhrase | QueryGroup | QueryOperatorNode;

export interface ParsedQuery {
  nodes: QueryNode[];
  defaultOperator: QueryOperator;
  hasHighlight: boolean; // true si on doit calculer les positions
}

export class QueryParser {
  
  /**
   * Parse une requête texte en AST structuré
   * Syntaxe supportée:
   * - terme simple: "mot"
   * - phrase: "mot phrase"
   * - OR explicite: "terme1 OR terme2"
   * - AND explicite: "terme1 AND terme2" 
   * - groupes: "(terme1 OR terme2) AND terme3"
   * - défaut: AND implicite entre termes
   */
  parse(query: string, enableHighlight = false): ParsedQuery {
    const trimmed = query.trim();
    if (!trimmed) {
      return {
        nodes: [],
        defaultOperator: 'AND',
        hasHighlight: enableHighlight
      };
    }

    const tokens = this.tokenize(trimmed);
    const nodes = this.parseTokens(tokens);
    
    return {
      nodes,
      defaultOperator: 'AND',
      hasHighlight: enableHighlight
    };
  }

  /**
   * Tokenise la requête en respectant guillemets et parenthèses
   */
  private tokenize(query: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < query.length; i++) {
      const char = query[i];
      const nextChar = query[i + 1];
      
      if (!inQuotes && (char === '"' || char === "'")) {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        inQuotes = true;
        quoteChar = char;
        continue;
      }
      
      if (inQuotes && char === quoteChar) {
        if (current.trim()) {
          tokens.push(`"${current.trim()}"`); // marquer comme phrase
        }
        current = '';
        inQuotes = false;
        quoteChar = '';
        continue;
      }
      
      if (inQuotes) {
        current += char;
        continue;
      }
      
      // Hors guillemets
      if (char === '(' || char === ')') {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        tokens.push(char);
        continue;
      }
      
      if (char === ' ' || char === '\t' || char === '\n') {
        if (current.trim()) {
          tokens.push(current.trim());
          current = '';
        }
        continue;
      }
      
      current += char;
    }
    
    if (current.trim()) {
      tokens.push(current.trim());
    }
    
    return tokens.filter(Boolean);
  }

  /**
   * Parse les tokens en AST
   */
  private parseTokens(tokens: string[]): QueryNode[] {
    const nodes: QueryNode[] = [];
    let i = 0;
    
    while (i < tokens.length) {
      const token = tokens[i];
      
      if (token === '(') {
        // Trouver la parenthèse fermante correspondante
        let depth = 1;
        let j = i + 1;
        const groupTokens: string[] = [];
        
        while (j < tokens.length && depth > 0) {
          if (tokens[j] === '(') depth++;
          else if (tokens[j] === ')') depth--;
          
          if (depth > 0) {
            groupTokens.push(tokens[j]);
          }
          j++;
        }
        
        if (groupTokens.length > 0) {
          const groupNodes = this.parseTokens(groupTokens);
          nodes.push({
            type: 'group',
            nodes: groupNodes,
            operator: 'AND' // défaut dans les groupes
          });
        }
        
        i = j;
        continue;
      }
      
      if (token.toUpperCase() === 'AND') {
        nodes.push({ type: 'operator', operator: 'AND' });
        i++;
        continue;
      }
      
      if (token.toUpperCase() === 'OR') {
        nodes.push({ type: 'operator', operator: 'OR' });
        i++;
        continue;
      }
      
      if (token.startsWith('"') && token.endsWith('"') && token.length > 2) {
        // Phrase
        const phrase = token.slice(1, -1);
        const terms = phrase.toLowerCase().split(/\s+/).filter(Boolean);
        nodes.push({
          type: 'phrase',
          value: phrase,
          terms,
          positions: [] // sera calculé lors du matching
        });
        i++;
        continue;
      }
      
      // Terme simple
      nodes.push({
        type: 'term',
        value: token.toLowerCase(),
        positions: []
      });
      i++;
    }
    
    return nodes;
  }

  /**
   * Évalue si un contenu texte matche la requête parsée
   */
  evaluate(parsedQuery: ParsedQuery, content: string): { matches: boolean; score: number; highlights?: HighlightMatch[] } {
    if (parsedQuery.nodes.length === 0) {
      return { matches: false, score: 0 };
    }

    const normalizedContent = this.normalize(content);
    let highlights: HighlightMatch[] = [];
    
    const result = this.evaluateNodes(parsedQuery.nodes, normalizedContent, parsedQuery.hasHighlight);
    
    if (parsedQuery.hasHighlight && result.highlights) {
      highlights = result.highlights;
    }
    
    return {
      matches: result.matches,
      score: result.score,
      highlights: parsedQuery.hasHighlight ? highlights : undefined
    };
  }

  private evaluateNodes(nodes: QueryNode[], content: string, enableHighlight: boolean): { matches: boolean; score: number; highlights?: HighlightMatch[] } {
    if (nodes.length === 0) return { matches: false, score: 0 };
    
    let currentOperator: QueryOperator = 'AND';
    let overallMatches = true;
    let overallScore = 0;
    let allHighlights: HighlightMatch[] = [];
    
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      
      if (node.type === 'operator') {
        currentOperator = node.operator;
        continue;
      }
      
      const nodeResult = this.evaluateNode(node, content, enableHighlight);
      
      if (enableHighlight && nodeResult.highlights) {
        allHighlights.push(...nodeResult.highlights);
      }
      
      if (i === 0) {
        // Premier node
        overallMatches = nodeResult.matches;
        overallScore = nodeResult.score;
      } else {
        // Appliquer l'opérateur courant
        if (currentOperator === 'AND') {
          overallMatches = overallMatches && nodeResult.matches;
          overallScore += nodeResult.score; // additionner les scores pour AND
        } else if (currentOperator === 'OR') {
          overallMatches = overallMatches || nodeResult.matches;
          overallScore = Math.max(overallScore, nodeResult.score); // maximum pour OR
        }
      }
    }
    
    return {
      matches: overallMatches,
      score: overallScore,
      highlights: enableHighlight ? allHighlights : undefined
    };
  }

  private evaluateNode(node: QueryNode, content: string, enableHighlight: boolean): { matches: boolean; score: number; highlights?: HighlightMatch[] } {
    switch (node.type) {
      case 'term':
        return this.evaluateTerm(node.value, content, enableHighlight);
        
      case 'phrase':
        return this.evaluatePhrase(node.terms, content, enableHighlight);
        
      case 'group':
        return this.evaluateNodes(node.nodes, content, enableHighlight);
        
      default:
        return { matches: false, score: 0 };
    }
  }

  private evaluateTerm(term: string, content: string, enableHighlight: boolean): { matches: boolean; score: number; highlights?: HighlightMatch[] } {
    // Normaliser le terme (suppression accents, ponctuation alignée avec le contenu normalisé)
    const normTerm = this.normalize(term);
    if (!normTerm) return { matches: false, score: 0 };
    const positions: number[] = [];
    let index = content.indexOf(normTerm);
    let count = 0;
    
    while (index !== -1) {
      count++;
      if (enableHighlight) {
        positions.push(index);
      }
      index = content.indexOf(normTerm, index + 1);
    }
    
    const highlights: HighlightMatch[] = enableHighlight ? 
      positions.map(pos => ({
        start: pos,
        end: pos + normTerm.length,
        term: normTerm,
        type: 'term'
      })) : [];
    
    return {
      matches: count > 0,
      score: count,
      highlights: enableHighlight ? highlights : undefined
    };
  }

  private evaluatePhrase(terms: string[], content: string, enableHighlight: boolean): { matches: boolean; score: number; highlights?: HighlightMatch[] } {
    if (terms.length === 0) return { matches: false, score: 0 };
    // Normaliser chaque terme puis reconstruire la phrase normalisée
    const normalizedTerms = terms.map(t => this.normalize(t)).filter(Boolean);
    if (!normalizedTerms.length) return { matches: false, score: 0 };
    const phrase = normalizedTerms.join(' ');
    const positions: number[] = [];
    let index = content.indexOf(phrase);
    let count = 0;
    
    while (index !== -1) {
      count++;
      if (enableHighlight) {
        positions.push(index);
      }
      index = content.indexOf(phrase, index + 1);
    }
    
    const highlights: HighlightMatch[] = enableHighlight ?
      positions.map(pos => ({
        start: pos,
        end: pos + phrase.length,
        term: phrase,
        type: 'phrase'
      })) : [];
    
    return {
      matches: count > 0,
      score: count * terms.length, // score plus élevé pour les phrases
      highlights: enableHighlight ? highlights : undefined
    };
  }

  private normalize(text: string): string {
    return text.toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // supprimer les accents (diacritiques)
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

export interface HighlightMatch {
  start: number;
  end: number;
  term: string;
  type: 'term' | 'phrase';
}

export const createQueryParser = () => new QueryParser();