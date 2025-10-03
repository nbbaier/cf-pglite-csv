import { sql } from "@codemirror/lang-sql";
import { keymap } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useMemo, useState } from "react";

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

	useEffect(() => {
		setValue(content);
	}, [content]);

	const handleRunQuery = useCallback(() => {
		if (onRunQuery && value.trim()) {
			onRunQuery(value);
		}
	}, [value, onRunQuery]);

	const extensions = useMemo(
		() => [
			sql(),
			keymap.of([
				{
					key: "Mod-Enter",
					run: () => {
						handleRunQuery();
						return true;
					},
				},
			]),
		],
		[handleRunQuery],
	);

	return (
		<CodeMirror
			className="w-full h-full"
			height="100%"
			width="100%"
			extensions={extensions}
			value={value}
			onChange={(value) => {
				setValue(value);
				onContentChange?.(value);
			}}
		/>
	);
};
