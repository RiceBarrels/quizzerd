'use client';

import { useState } from 'react';
import TextEditor from '@/components/editors/text-editor';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestEditorPage() {
  const [content, setContent] = useState('');
  const [rawContent, setRawContent] = useState('');

  const handleChange = (value) => {
    console.log('Editor value changed:', value);
    setContent(value);
    // Also store raw for debugging
    setRawContent(value);
  };

  const testContent = () => {
    const test = '<p>Testing {{variable}} here and {{another}} variable</p>';
    setContent(test);
  };

  return (
    <div className="container mx-auto p-8">
      <Card>
        <CardHeader>
          <CardTitle>Text Editor Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <button 
              onClick={testContent}
              className="px-4 py-2 bg-blue-500 text-white rounded"
            >
              Set Test Content with Variables
            </button>
          </div>
          
          <div className="space-y-2">
            <label className="font-semibold">Editor:</label>
            <TextEditor
              value={content}
              onChange={handleChange}
              placeholder="Type {{variable}} to test variables"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold">Raw HTML Output:</label>
            <pre className="p-4 bg-gray-100 rounded overflow-auto text-xs">
              {rawContent || '(empty)'}
            </pre>
          </div>

          <div className="space-y-2">
            <label className="font-semibold">Rendered Preview:</label>
            <div 
              className="p-4 border rounded prose prose-sm"
              dangerouslySetInnerHTML={{ __html: content || '<p>(empty)</p>' }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}