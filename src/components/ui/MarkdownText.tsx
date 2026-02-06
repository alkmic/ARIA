import React from 'react';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Rich markdown renderer for coach responses
 * Supports: headings (#, ##, ###), **bold**, *italic*, _italic_, `code`,
 * blockquotes (>), horizontal rules (---), bullet lists, and numbered lists
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ children, className = '' }) => {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      // Headings (most specific first to avoid partial matches)
      const h3Match = line.match(/^###\s+(.*)$/);
      const h2Match = !h3Match ? line.match(/^##\s+(.*)$/) : null;
      const h1Match = !h3Match && !h2Match ? line.match(/^#\s+(.*)$/) : null;

      // Horizontal rules and blockquotes
      const hrMatch = line.match(/^(-{3,}|\*{3,}|_{3,})$/);
      const blockquoteMatch = !hrMatch ? line.match(/^>\s*(.*)$/) : null;

      // List items
      const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);

      if (h3Match) {
        result.push(
          <h3 key={lineIndex} className="text-[15px] font-semibold text-slate-800 mt-3 mb-1 flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-gradient-to-b from-al-blue-400 to-al-sky flex-shrink-0" />
            {renderInlineMarkdown(h3Match[1])}
          </h3>
        );
      } else if (h2Match) {
        result.push(
          <h2 key={lineIndex} className="text-base font-bold text-slate-900 mt-4 mb-1.5 pb-1.5 border-b border-slate-200">
            {renderInlineMarkdown(h2Match[1])}
          </h2>
        );
      } else if (h1Match) {
        result.push(
          <h1 key={lineIndex} className="text-lg font-bold text-slate-900 mt-4 mb-2">
            {renderInlineMarkdown(h1Match[1])}
          </h1>
        );
      } else if (hrMatch) {
        result.push(
          <hr key={lineIndex} className="my-3 border-slate-200" />
        );
      } else if (blockquoteMatch) {
        result.push(
          <div key={lineIndex} className="pl-3 py-1 my-1 border-l-2 border-al-blue-200 bg-slate-50/80 rounded-r text-sm text-slate-500 italic">
            {renderInlineMarkdown(blockquoteMatch[1])}
          </div>
        );
      } else if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const content = bulletMatch[2];
        result.push(
          <div
            key={lineIndex}
            className={`flex items-start gap-2 ${indent > 0 ? 'ml-4' : ''}`}
            style={{ marginLeft: indent > 3 ? '1rem' : 0 }}
          >
            <span className="text-al-blue-500 font-bold mt-0.5 flex-shrink-0">•</span>
            <span>{renderInlineMarkdown(content)}</span>
          </div>
        );
      } else if (numberedMatch) {
        const indent = numberedMatch[1].length;
        const num = numberedMatch[2];
        const content = numberedMatch[3];
        result.push(
          <div
            key={lineIndex}
            className={`flex items-start gap-2 ${indent > 0 ? 'ml-4' : ''}`}
          >
            <span className="text-al-blue-600 font-semibold min-w-[1.5rem] flex-shrink-0">{num}.</span>
            <span className="flex-1">{renderInlineMarkdown(content)}</span>
          </div>
        );
      } else if (line.trim() === '') {
        // Empty line = paragraph break
        result.push(<div key={lineIndex} className="h-2" />);
      } else {
        // Regular line
        result.push(
          <div key={lineIndex}>
            {renderInlineMarkdown(line)}
          </div>
        );
      }
    });

    return result;
  };

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Process inline markdown: **bold**, *italic*, _italic_, `code`
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;
    let key = 0;

    // Combined regex for all inline patterns
    const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(_(.+?)_)|(`(.+?)`)/g;
    let match;

    while ((match = inlineRegex.exec(text)) !== null) {
      // Add text before the match
      if (match.index > currentIndex) {
        parts.push(
          <span key={key++}>{text.slice(currentIndex, match.index)}</span>
        );
      }

      // Process the match
      if (match[2]) {
        // **bold**
        parts.push(
          <strong key={key++} className="font-bold text-slate-900">
            {match[2]}
          </strong>
        );
      } else if (match[4]) {
        // *italic*
        parts.push(
          <em key={key++} className="italic text-slate-600">
            {match[4]}
          </em>
        );
      } else if (match[6]) {
        // _italic_
        parts.push(
          <em key={key++} className="italic text-slate-600">
            {match[6]}
          </em>
        );
      } else if (match[8]) {
        // `code`
        parts.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 bg-slate-100 text-al-blue-600 rounded text-sm font-mono"
          >
            {match[8]}
          </code>
        );
      }

      currentIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (currentIndex < text.length) {
      parts.push(<span key={key++}>{text.slice(currentIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className={`markdown-text space-y-1 ${className}`}>
      {renderMarkdown(children)}
    </div>
  );
};

/**
 * Styled insight box for coach insights
 */
export const InsightBox: React.FC<{
  children: string;
  variant?: 'info' | 'warning' | 'success' | 'error';
}> = ({ children, variant = 'info' }) => {
  const variantStyles = {
    info: 'bg-gradient-to-r from-al-blue-50 to-sky-50 border-al-blue-200 text-al-blue-900',
    warning: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 text-amber-900',
    success: 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-green-900',
    error: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-200 text-red-900',
  };

  return (
    <div className={`p-3 rounded-lg border ${variantStyles[variant]}`}>
      <MarkdownText className="text-sm leading-relaxed">{children}</MarkdownText>
    </div>
  );
};

export default MarkdownText;
