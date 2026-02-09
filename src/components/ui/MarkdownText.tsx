import React from 'react';

interface MarkdownTextProps {
  children: string;
  className?: string;
}

/**
 * Simple markdown renderer for coach responses
 * Supports: # headers, **bold**, *italic*, _italic_, `code`, [links](url), lists, hr, and line breaks
 */
export const MarkdownText: React.FC<MarkdownTextProps> = ({ children, className = '' }) => {
  const renderMarkdown = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
      // Check for headers (### h3, ## h2, # h1)
      const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const content = headerMatch[2];
        const headerStyles: Record<number, string> = {
          1: 'text-xl font-bold text-slate-900 mt-3 mb-1',
          2: 'text-lg font-bold text-slate-800 mt-2.5 mb-1',
          3: 'text-base font-semibold text-slate-800 mt-2 mb-0.5',
          4: 'text-sm font-semibold text-slate-700 mt-1.5 mb-0.5',
          5: 'text-sm font-medium text-slate-700 mt-1',
          6: 'text-xs font-medium text-slate-600 mt-1',
        };
        const rendered = renderInlineMarkdown(content);
        const cls = headerStyles[level];
        if (level === 1) result.push(<h1 key={lineIndex} className={cls}>{rendered}</h1>);
        else if (level === 2) result.push(<h2 key={lineIndex} className={cls}>{rendered}</h2>);
        else if (level === 3) result.push(<h3 key={lineIndex} className={cls}>{rendered}</h3>);
        else if (level === 4) result.push(<h4 key={lineIndex} className={cls}>{rendered}</h4>);
        else if (level === 5) result.push(<h5 key={lineIndex} className={cls}>{rendered}</h5>);
        else result.push(<h6 key={lineIndex} className={cls}>{rendered}</h6>);
        return;
      }

      // Check for horizontal rules (--- or ***)
      if (/^[-*_]{3,}\s*$/.test(line.trim())) {
        result.push(<hr key={lineIndex} className="border-slate-200 my-2" />);
        return;
      }

      // Check for list items
      const bulletMatch = line.match(/^(\s*)[•\-\*]\s+(.*)$/);
      const numberedMatch = line.match(/^(\s*)(\d+)\.\s+(.*)$/);

      if (bulletMatch) {
        const indent = bulletMatch[1].length;
        const content = bulletMatch[2];
        result.push(
          <div
            key={lineIndex}
            className={`flex items-start gap-2 ${indent > 0 ? 'ml-4' : ''}`}
            style={{ marginLeft: indent > 3 ? '1rem' : 0 }}
          >
            <span className="text-al-blue-500 font-bold mt-0.5">•</span>
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
            <span className="text-al-blue-600 font-semibold min-w-[1.5rem]">{num}.</span>
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

    // Combined regex for all inline patterns (order matters: bold before italic)
    const inlineRegex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(_(.+?)_)|(`(.+?)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
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
          <em key={key++} className="italic text-slate-700">
            {match[4]}
          </em>
        );
      } else if (match[6]) {
        // _italic_
        parts.push(
          <em key={key++} className="italic text-slate-700">
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
      } else if (match[10] && match[11]) {
        // [text](url)
        parts.push(
          <a
            key={key++}
            href={match[11]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-al-blue-600 hover:text-al-blue-800 underline underline-offset-2"
          >
            {match[10]}
          </a>
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
    info: 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 text-blue-900',
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
