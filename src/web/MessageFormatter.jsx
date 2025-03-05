// src/web/MessageFormatter.jsx
import React from 'react';

const MessageFormatter = ({ content }) => {
  const formatSection = (text) => {
    const lines = text.split('\n');
    const formattedLines = [];
    let currentSection = { title: '', items: [] };

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Handle section headers
      if (trimmedLine.startsWith('#')) {
        if (currentSection.title || currentSection.items.length) {
          formattedLines.push(currentSection);
        }
        currentSection = {
          title: trimmedLine.replace('#', '').trim(),
          items: []
        };
      }
      // Handle bullet points
      else if (trimmedLine.startsWith('-')) {
        currentSection.items.push(trimmedLine.substring(1).trim());
      }
      // Handle regular text
      else if (trimmedLine.length > 0) {
        currentSection.items.push(trimmedLine);
      }
    });

    // Push the last section
    if (currentSection.title || currentSection.items.length) {
      formattedLines.push(currentSection);
    }

    return formattedLines;
  };

  const formattedContent = formatSection(content);

  return (
    <div className="space-y-4">
      {formattedContent.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-2">
          {section.title && (
            <h3 className="text-lg font-semibold text-gray-800">
              {section.title}
            </h3>
          )}
          <ul className="space-y-1">
            {section.items.map((item, itemIndex) => (
              <li key={itemIndex} className="text-gray-700">
                {item.startsWith('[TASK]') ? (
                  <div className="bg-blue-50 p-2 rounded">
                    {item}
                  </div>
                ) : (
                  item
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default MessageFormatter;