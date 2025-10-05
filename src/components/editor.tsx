import { PostgreSQL, sql } from "@codemirror/lang-sql";
import { Prec } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";

import { useEffect, useState } from "react";
import { useResolvedTheme } from "./theme-provider";

interface CodeEditorProps {
	content: string;
	onRunQuery?: (query: string) => void;
	onContentChange?: (content: string) => void;
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
			]),
		),
	];

	return (
		<CodeMirror
			className="w-full h-full"
			height="100%"
			width="100%"
			theme={resolvedTheme}
			extensions={extensions}
			value={value}
			onChange={(value) => {
				setValue(value);
				onContentChange?.(value);
			}}
		/>
	);
};
