export type QuickFixId =
  | "close-comment"
  | "escape-ampersand"
  | "quote-attribute"
  | "close-tag"
  | "fix-closing-tag"
  | "remove-stray-text"
  | "remove-duplicate-attr";

export interface ValidationIssue {
  line: number;
  column?: number;
  severity: "error" | "warning";
  message: string;
  context: string;
  fixId?: QuickFixId;
  fixData?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export function validateMetaXml(xml: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const lines = xml.split("\n");

  // Track tag stack for matching
  const tagStack: { tag: string; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const line = lines[i];
    const trimmed = line.trim();

    // Skip empty lines and XML declaration
    if (!trimmed || trimmed.startsWith("<?xml")) continue;

    // Skip comments
    if (trimmed.startsWith("<!--")) {
      if (!trimmed.includes("-->")) {
        // Multi-line comment — find the end
        let found = false;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes("-->")) {
            found = true;
            i = j;
            break;
          }
        }
        if (!found) {
          issues.push({
            line: lineNum,
            severity: "error",
            message: "Unclosed comment block",
            context: trimmed.substring(0, 80),
            fixId: "close-comment",
          });
        }
      }
      continue;
    }

    // Check for stray text outside of tags
    if (!trimmed.startsWith("<") && !trimmed.endsWith(">")) {
      // Could be text content inside a tag — check if we're inside a tag
      if (tagStack.length === 0) {
        issues.push({
          line: lineNum,
          severity: "error",
          message: "Stray text outside of any XML element",
          context: trimmed.substring(0, 80),
          fixId: "remove-stray-text",
        });
      }
      continue;
    }

    // Check for malformed tags — angle bracket mismatches
    const openCount = (line.match(/</g) || []).length;
    const closeCount = (line.match(/>/g) || []).length;
    if (openCount !== closeCount) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: `Mismatched angle brackets: ${openCount} '<' vs ${closeCount} '>'`,
        context: trimmed.substring(0, 80),
      });
      continue;
    }

    // Check for empty tag names like < > or </>
    if (/<\s+>/.test(line) || /<\/\s*>/.test(line)) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: "Empty or whitespace-only tag name",
        context: trimmed.substring(0, 80),
      });
      continue;
    }

    // Extract all tags from this line
    const tagRegex = /<\/?([a-zA-Z_][\w:.-]*)[^>]*\/?>/g;
    let match;
    while ((match = tagRegex.exec(line)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];

      if (fullMatch.startsWith("</")) {
        // Closing tag
        if (tagStack.length === 0) {
          issues.push({
            line: lineNum,
            severity: "error",
            message: `Closing tag </${tagName}> without matching opening tag`,
            context: trimmed.substring(0, 80),
            fixId: "remove-stray-text",
            fixData: { tag: tagName },
          });
        } else {
          const top = tagStack[tagStack.length - 1];
          if (top.tag !== tagName) {
            issues.push({
              line: lineNum,
              severity: "error",
              message: `Mismatched closing tag: expected </${top.tag}> (opened at line ${top.line}) but found </${tagName}>`,
              context: trimmed.substring(0, 80),
              fixId: "fix-closing-tag",
              fixData: { expected: top.tag, found: tagName },
            });
            // Try to recover — pop until we find a match or empty the stack
            let recovered = false;
            for (let s = tagStack.length - 2; s >= 0; s--) {
              if (tagStack[s].tag === tagName) {
                tagStack.splice(s);
                recovered = true;
                break;
              }
            }
            if (!recovered) {
              tagStack.pop();
            }
          } else {
            tagStack.pop();
          }
        }
      } else if (fullMatch.endsWith("/>")) {
        // Self-closing tag — no stack change
      } else {
        // Opening tag
        tagStack.push({ tag: tagName, line: lineNum });
      }
    }

    // Check for duplicate attributes on a single tag
    const attrTagRegex = /<[a-zA-Z_][\w:.-]*\s+([^>]+?)>/g;
    let attrMatch;
    while ((attrMatch = attrTagRegex.exec(line)) !== null) {
      const attrStr = attrMatch[1];
      const attrNames: string[] = [];
      const attrNameRegex = /([a-zA-Z_][\w:.-]*)\s*=/g;
      let an;
      while ((an = attrNameRegex.exec(attrStr)) !== null) {
        const name = an[1];
        if (attrNames.includes(name)) {
          issues.push({
            line: lineNum,
            severity: "warning",
            message: `Duplicate attribute "${name}" on element`,
            context: trimmed.substring(0, 80),
            fixId: "remove-duplicate-attr",
            fixData: { attr: name },
          });
        }
        attrNames.push(name);
      }
    }

    // Check for common GTA meta issues
    // Unquoted attribute values
    if (/<[^>]+=[^"'][^\s/>]+/.test(line) && !/<\?/.test(line)) {
      // More precise check: find attr=value where value isn't quoted
      const unquotedRegex = /\s([a-zA-Z_][\w:.-]*)=([^"'\s/>][^\s/>]*)/g;
      let uq;
      while ((uq = unquotedRegex.exec(line)) !== null) {
        issues.push({
          line: lineNum,
          severity: "warning",
          message: `Unquoted attribute value for "${uq[1]}": ${uq[2]}`,
          context: trimmed.substring(0, 80),
          fixId: "quote-attribute",
          fixData: { attr: uq[1], value: uq[2] },
        });
      }
    }

    // Check for invalid characters that shouldn't be in XML
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(line)) {
      issues.push({
        line: lineNum,
        severity: "error",
        message: "Line contains invalid control characters",
        context: trimmed.substring(0, 80),
      });
    }

    // Check for unescaped ampersands (common copy-paste error)
    if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[0-9a-fA-F]+;)/.test(line)) {
      issues.push({
        line: lineNum,
        severity: "warning",
        message: "Unescaped '&' character (should be &amp;)",
        context: trimmed.substring(0, 80),
        fixId: "escape-ampersand",
      });
    }
  }

  // Report unclosed tags
  for (const unclosed of tagStack) {
    issues.push({
      line: unclosed.line,
      severity: "error",
      message: `Unclosed tag <${unclosed.tag}> — never closed`,
      context: lines[unclosed.line - 1]?.trim().substring(0, 80) ?? "",
      fixId: "close-tag",
      fixData: { tag: unclosed.tag },
    });
  }

  // Sort by line number
  issues.sort((a, b) => a.line - b.line);

  return {
    valid: issues.filter((i) => i.severity === "error").length === 0,
    issues,
  };
}
