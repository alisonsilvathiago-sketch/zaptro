const fs = require('fs');
let code = fs.readFileSync('src/pages/ZaptroHomeInicio.tsx', 'utf8');

code = code.replace(/<div\s+id="zaptro-inicio-assistant"[\s\S]*?<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>\n\s*<\/ZaptroLayout>/m, '</div>\n        </div>\n      </div>\n    </ZaptroLayout>');

code = code.replace(/const \[assistantText, setAssistantText\] = useState\(''\);\n\s*const \[copilotReply, setCopilotReply\] = useState<ZaptroInicioCopilotKeywordReply \| null>\(null\);\n\s*\/\*\* Incrementado a cada envio para reiniciar o efeito de digitação\. \*\/\n\s*const \[copilotTypingKey, setCopilotTypingKey\] = useState\(0\);\n\s*const \[shortcut, setShortcut\] = useState\(''\);\n/m, '');

code = code.replace(/const submitInicioCopilot = useCallback\(\(\) => \{[\s\S]*?\}, \[assistantText, shortcut, firstName\]\);\n/m, '');

code = code.replace(/import \{\n\s*ZAPTRO_INICIO_COPILOT_QUICK_ACTIONS\n\} from '\.\.\/constants\/zaptroInicioAssistantCopilot';\n/, '');
code = code.replace(/import \{\n\s*getZaptroInicioCopilotKeywordReply,\n\s*type ZaptroInicioCopilotKeywordReply,\n\} from '\.\.\/lib\/zaptroInicioCopilotKeywordReply';\nimport \{ personalizeZaptroInicioCopilotReply \} from '\.\.\/lib\/zaptroInicioCopilotPersonalize';\n/, '');

// Remove CopilotTypingReply component
code = code.replace(/type CopilotBlockKind = [\s\S]*?function CopilotTypingReply[\s\S]*?navigate: \(path: string\) => void;\n}\) \{[\s\S]*?\n\}\n/m, '');

fs.writeFileSync('src/pages/ZaptroHomeInicio.tsx', code);
console.log("Done");
