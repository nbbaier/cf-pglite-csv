import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

import { useEffect, useState } from "react";
import { useResolvedTheme } from "./theme-provider";

interface CodeEditorProps {
  content: string;
  onContentChange?: (content: string) => void;
  onRunQuery?: (query: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  content,
  onRunQuery,
  onContentChange,
}) => {
  const [value, setValue] = useState(content);
  const resolvedTheme = useResolvedTheme();

  useEffect(() => {
    setValue(content);
  }, [content]);

  const handleRunQuery = () => {
    if (onRunQuery && value.trim()) {
      onRunQuery(value);
    }
  };

  const extensions = [
    sql({ dialect: PostgreSQL }),
    Prec.high(
      keymap.of([
        {
          key: "Mod-Enter",
          run: () => {
            handleRunQuery();
            return true;
          },
        },
      ])
    ),
  ];

  return (
    <CodeMirror
      className="h-full w-full"
      extensions={extensions}
      height="100%"
      onChange={(value) => {
        setValue(value);
        onContentChange?.(value);
      }}
      theme={resolvedTheme}
      value={value}
      width="100%"
    />
  );
};
