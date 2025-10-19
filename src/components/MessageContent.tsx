'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ChartRenderer from './ChartRenderer';

interface MessageContentProps {
  content: string;
}

export default function MessageContent({ content }: MessageContentProps) {
  // Extract chart blocks from markdown
  const parseContent = () => {
    const parts: React.ReactNode[] = [];
    const chartRegex = /```chart\n([\s\S]*?)\n```/g;
    let lastIndex = 0;
    let match;

    while ((match = chartRegex.exec(content)) !== null) {
      // Add text before chart
      if (match.index > lastIndex) {
        const textBefore = content.substring(lastIndex, match.index);
        parts.push(
          <div key={`text-${lastIndex}`} className="prose prose-sm max-w-none break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
                h2: ({ ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props} />,
                h3: ({ ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />,
                p: ({ ...props }) => <p className="mb-3 text-gray-700 leading-relaxed break-words" {...props} />,
                ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...props} />,
                li: ({ ...props }) => <li className="mb-1 break-words" {...props} />,
                code: ({ className, children, ...props }: any) => {
                  const inline = !className;
                  return inline ? (
                    <code className="px-1.5 py-0.5 bg-gray-100 text-red-600 rounded text-sm font-mono break-all" {...props}>
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ ...props }) => <pre className="mb-4 max-w-full overflow-x-auto" {...props} />,
                blockquote: ({ ...props }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 break-words" {...props} />
                ),
                strong: ({ ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                a: ({ ...props }) => (
                  <a className="text-blue-600 hover:text-blue-800 underline break-all" target="_blank" rel="noopener noreferrer" {...props} />
                ),
                table: ({ ...props }) => (
                  <div className="overflow-x-auto my-4 max-w-full">
                    <table className="min-w-full border-collapse border border-gray-300" {...props} />
                  </div>
                ),
                thead: ({ ...props }) => <thead className="bg-gray-100" {...props} />,
                th: ({ ...props }) => (
                  <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900" {...props} />
                ),
                td: ({ ...props }) => (
                  <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props} />
                ),
              }}
            >
              {textBefore}
            </ReactMarkdown>
          </div>
        );
      }

      // Add chart
      try {
        const chartData = JSON.parse(match[1]);
        parts.push(
          <ChartRenderer key={`chart-${match.index}`} chartData={chartData} />
        );
      } catch (error) {
        console.error('Error parsing chart data:', error);
        parts.push(
          <div key={`error-${match.index}`} className="my-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            Error: Could not render chart. Invalid chart data format.
          </div>
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.substring(lastIndex);
      parts.push(
        <div key={`text-${lastIndex}`} className="prose prose-sm max-w-none break-words">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ ...props }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-gray-900" {...props} />,
              h2: ({ ...props }) => <h2 className="text-xl font-bold mt-5 mb-3 text-gray-900" {...props} />,
              h3: ({ ...props }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />,
              p: ({ ...props }) => <p className="mb-3 text-gray-700 leading-relaxed break-words" {...props} />,
              ul: ({ ...props }) => <ul className="list-disc list-inside mb-3 space-y-1 text-gray-700" {...props} />,
              ol: ({ ...props }) => <ol className="list-decimal list-inside mb-3 space-y-1 text-gray-700" {...props} />,
              li: ({ ...props }) => <li className="mb-1 break-words" {...props} />,
              code: ({ className, children, ...props }: any) => {
                const inline = !className;
                return inline ? (
                  <code className="px-1.5 py-0.5 bg-gray-100 text-red-600 rounded text-sm font-mono break-all" {...props}>
                    {children}
                  </code>
                ) : (
                  <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre-wrap break-words" {...props}>
                    {children}
                  </code>
                );
              },
              pre: ({ ...props }) => <pre className="mb-4 max-w-full overflow-x-auto" {...props} />,
              blockquote: ({ ...props }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-700 break-words" {...props} />
              ),
              strong: ({ ...props }) => <strong className="font-bold text-gray-900" {...props} />,
              a: ({ ...props }) => (
                <a className="text-blue-600 hover:text-blue-800 underline break-all" target="_blank" rel="noopener noreferrer" {...props} />
              ),
              table: ({ ...props }) => (
                <div className="overflow-x-auto my-4 max-w-full">
                  <table className="min-w-full border-collapse border border-gray-300" {...props} />
                </div>
              ),
              thead: ({ ...props }) => <thead className="bg-gray-100" {...props} />,
              th: ({ ...props }) => (
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900" {...props} />
              ),
              td: ({ ...props }) => (
                <td className="border border-gray-300 px-4 py-2 text-gray-700" {...props} />
              ),
            }}
          >
            {remainingText}
          </ReactMarkdown>
        </div>
      );
    }

    return parts;
  };

  return <div className="message-content">{parseContent()}</div>;
}
