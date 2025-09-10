/**
 * Replace mentions of "balaklava" with "baklava" (plurals included) on the page.
 * - Preserves common casing styles: lowercase, UPPERCASE, Capitalized.
 * - Skips editable fields and non-visible/script/style areas.
 */

const WORD_REGEX = /\b(balaklava)(s)?\b/gi;
const REPLACEMENT_BASE = 'baklava';

const EXCLUDED_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'CODE', 'PRE']);

/**
 * Apply casing of the template string to the target string.
 * - ALL UPPER -> ALL UPPER
 * - all lower -> all lower
 * - Capitalized -> Capitalized
 * - otherwise -> return as-is (lowercase)
 */
function applyCasing(template: string, target: string): string {
  if (template.toUpperCase() === template) {
    return target.toUpperCase();
  }

  if (template.toLowerCase() === template) {
    return target.toLowerCase();
  }

  const first = template.charAt(0);
  const rest = template.slice(1);
  if (first.toUpperCase() === first && rest.toLowerCase() === rest) {
    return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
  }

  return target; // fallback
}

function isExcludedElement(el: Element | null): boolean {
  if (!el) return false;

  let cur: Element | null = el;
  while (cur) {
    if (EXCLUDED_TAGS.has(cur.tagName)) return true;
    // Skip contenteditable regions
    if ((cur as HTMLElement).isContentEditable) return true;
    cur = cur.parentElement;
  }
  return false;
}

function replaceInTextNode(node: Text): void {
  const parent = node.parentElement;
  if (isExcludedElement(parent)) return;

  const original = node.nodeValue;
  if (!original) return;

  const replaced = original.replace(WORD_REGEX, (match, base: string, plural: string | undefined) => {
    const replacementFull = REPLACEMENT_BASE + (plural ? 's' : '');
    return applyCasing(match, replacementFull);
  });

  if (replaced !== original) {
    node.nodeValue = replaced;
  }
}

function processSubtree(root: Node): void {
  // If it's a text node, process directly
  if (root.nodeType === Node.TEXT_NODE) {
    replaceInTextNode(root as Text);
    return;
  }

  // Otherwise, walk all text nodes in the subtree
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n: Node) => {
      const parent = (n as Text).parentElement;
      if (isExcludedElement(parent)) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  let current: Node | null = walker.nextNode();
  while (current) {
    replaceInTextNode(current as Text);
    current = walker.nextNode();
  }
}

function init(): void {
  if (document.body) {
    processSubtree(document.body);
  }

  // Watch for dynamic changes
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'characterData' && m.target && m.target.nodeType === Node.TEXT_NODE) {
        replaceInTextNode(m.target as Text);
      }

      for (const added of Array.from(m.addedNodes)) {
        processSubtree(added);
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

if (document.readyState === 'loading') {
  const onReady = () => {
    document.removeEventListener('DOMContentLoaded', onReady);
    init();
  };
  document.addEventListener('DOMContentLoaded', onReady);
} else {
  init();
}

export {};
