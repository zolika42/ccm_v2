/**
 * @fileoverview Safe-ish legacy HTML renderer for product descriptions and notes.
 */
import React, { useMemo } from 'react';

const ALLOWED_TAGS = new Set([
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'em', 'i', 'li', 'ol', 'p', 'pre', 'strong', 'u', 'ul',
  'h2', 'h3', 'h4', 'hr', 'span',
]);

const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  abbr: new Set(['title']),
  span: new Set([]),
  code: new Set([]),
  pre: new Set([]),
};

function isSafeHref(value: string) {
  return /^(https?:|mailto:|tel:|\/|#)/i.test(value.trim());
}

function sanitizeLegacyHtml(input: string) {
  if (typeof window === 'undefined' || typeof window.DOMParser === 'undefined') {
    return input;
  }

  const document = new window.DOMParser().parseFromString(input, 'text/html');

  const sanitizeNode = (node: ParentNode) => {
    Array.from(node.children).forEach((child) => {
      const tagName = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }

      Array.from(child.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value;
        const allowed = ALLOWED_ATTRIBUTES[tagName] ?? new Set<string>();

        if (name.startsWith('on') || name === 'style' || !allowed.has(name)) {
          child.removeAttribute(attribute.name);
          return;
        }

        if (tagName === 'a' && name === 'href' && !isSafeHref(value)) {
          child.removeAttribute(attribute.name);
        }
      });

      if (tagName === 'a' && child.getAttribute('target') === '_blank') {
        child.setAttribute('rel', 'noopener noreferrer');
      }

      sanitizeNode(child);
    });
  };

  sanitizeNode(document.body);
  return document.body.innerHTML;
}

function renderPlainText(text: string, preserveLineBreaks: boolean) {
  if (!preserveLineBreaks) {
    return <p>{text}</p>;
  }

  const paragraphs = text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => {
        const lines = paragraph.split('\n');
        return (
          <p key={`${paragraph}-${index}`}>
            {lines.map((line, lineIndex) => (
              <React.Fragment key={`${line}-${lineIndex}`}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function HtmlContent({
  value,
  className,
  preserveLineBreaks = true,
}: {
  value?: string;
  className?: string;
  preserveLineBreaks?: boolean;
}) {
  const normalizedValue = (value ?? '').trim();

  const sanitizedHtml = useMemo(() => {
    if (normalizedValue === '' || !looksLikeHtml(normalizedValue)) {
      return '';
    }

    return sanitizeLegacyHtml(normalizedValue);
  }, [normalizedValue]);

  if (normalizedValue === '') {
    return null;
  }

  if (sanitizedHtml !== '') {
    return <div className={className} dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
  }

  return <div className={className}>{renderPlainText(normalizedValue, preserveLineBreaks)}</div>;
}
