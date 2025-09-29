'use client';

import { useEffect, useState } from 'react';
import { parseAndRenderVariables, extractVariablesFromHTML, generateSampleVariables } from '@/lib/variable-parser';
import { Badge } from '@/components/ui/badge';

export default function VariableContent({ 
  htmlContent, 
  variables = null, 
  showVariableList = false,
  className = '' 
}) {
  const [renderedContent, setRenderedContent] = useState('');
  const [usedVariables, setUsedVariables] = useState([]);
  const [sampleVariables, setSampleVariables] = useState({});

  useEffect(() => {
    if (!htmlContent) {
      setRenderedContent('');
      setUsedVariables([]);
      return;
    }

    // Extract variables from content
    const extractedVars = extractVariablesFromHTML(htmlContent);
    setUsedVariables(extractedVars);

    // Use provided variables or generate samples
    const varsToUse = variables || generateSampleVariables(extractedVars);
    setSampleVariables(varsToUse);

    // Render content with variables
    const rendered = parseAndRenderVariables(htmlContent, varsToUse);
    setRenderedContent(rendered);
  }, [htmlContent, variables]);

  return (
    <div className={className}>
      {showVariableList && usedVariables.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {usedVariables.map(varName => (
            <Badge key={varName} variant="secondary" className="text-xs">
              {varName} = {sampleVariables[varName] || '?'}
            </Badge>
          ))}
        </div>
      )}
      <div 
        className="variable-content prose prose-sm max-w-none"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />
      <style jsx>{`
        :global(.variable-value) {
          background-color: rgba(59, 130, 246, 0.1);
          padding: 0 4px;
          border-radius: 3px;
          font-weight: 500;
          color: rgb(37, 99, 235);
        }
        :global(.variable-placeholder) {
          background-color: rgba(239, 68, 68, 0.1);
          padding: 0 4px;
          border-radius: 3px;
          font-style: italic;
          color: rgb(185, 28, 28);
        }
      `}</style>
    </div>
  );
}