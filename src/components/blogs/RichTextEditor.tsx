'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as LinkIcon, Palette } from 'lucide-react';

// Rich text box for blog content — same toolbar as the Design House admin's
// editor (bold / italic / underline, alignment, lists, headings, link, text
// colour), in CityCalls green. `code` mode is a plain monospace textarea for
// pasting meta tags or JSON-LD.

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  code?: boolean;
}

const EMPTY_FORMATS = {
  bold: false,
  italic: false,
  underline: false,
  justifyLeft: false,
  justifyCenter: false,
  justifyRight: false,
  insertUnorderedList: false,
  insertOrderedList: false,
  formatBlock: 'p',
};

// Pasted Word / web content: keep text colour, drop everything else.
function cleanPastedHtml(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.body.querySelectorAll('*').forEach((el) => {
    const node = el as HTMLElement;
    const color = node.style.color;
    node.removeAttribute('style');
    if (color) node.style.color = color;
    node.removeAttribute('class');
    node.removeAttribute('id');
    if (node.tagName === 'FONT') node.replaceWith(...Array.from(node.childNodes));
  });
  return doc.body.innerHTML
    .replace(/<p>\s*(&nbsp;)*\s*<\/p>/gi, '')
    .replace(/(&nbsp;){2,}/gi, ' ')
    .replace(/(<br\s*\/?>\s*){2,}/gi, '<br>')
    .replace(/\s{2,}/g, ' ');
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = '300px', code = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [formats, setFormats] = useState(EMPTY_FORMATS);
  const [colorCode, setColorCode] = useState('');

  // Keep the editable area in step with the value (first load, reset…).
  useEffect(() => {
    if (!code && editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value, code]);

  const refreshFormats = useCallback(() => {
    if (code || !editorRef.current) return;
    setFormats({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
      insertUnorderedList: document.queryCommandState('insertUnorderedList'),
      insertOrderedList: document.queryCommandState('insertOrderedList'),
      formatBlock: (document.queryCommandValue('formatBlock') || 'p').toLowerCase(),
    });
  }, [code]);

  const emit = () => onChange(editorRef.current?.innerHTML ?? '');

  const exec = (command: string, arg?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    emit();
    refreshFormats();
  };

  // onMouseDown + preventDefault keeps the text selection while clicking.
  const action = (e: React.MouseEvent, command: string, arg?: string) => {
    e.preventDefault();
    exec(command, arg);
  };

  const toggleLink = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    let node: Node | null = selection?.rangeCount ? selection.getRangeAt(0).startContainer : null;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
    while (node && node !== editorRef.current) {
      if ((node as HTMLElement).tagName === 'A') return exec('unlink');
      node = node.parentNode;
    }
    const url = window.prompt('Enter link URL (https://…):');
    if (url) exec('createLink', url);
  };

  const onPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');
    if (html) document.execCommand('insertHTML', false, cleanPastedHtml(html));
    else document.execCommand('insertText', false, text);
    emit();
  };

  const applyColorCode = () => {
    const hex = colorCode.replace('#', '');
    if (/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) exec('foreColor', `#${hex}`);
  };

  const btn = (active: boolean) =>
    `flex h-8 min-w-8 items-center justify-center rounded border-2 px-2 text-xs shadow-sm transition-colors ${
      active ? 'border-[#3e8914] bg-[#3e8914]/10 text-[#2f6b0f]' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
    }`;

  if (code) {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="w-full resize-y border-2 border-gray-300 bg-gray-50/60 p-3 font-mono text-[11px] leading-relaxed text-gray-900 outline-none focus:border-[#3e8914]"
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className="overflow-hidden border-2 border-gray-300 bg-white focus-within:border-[#3e8914]">
      <div className="flex flex-wrap items-center gap-1 border-b-2 border-gray-200 bg-gray-50 p-2">
        <button type="button" title="Bold" onMouseDown={(e) => action(e, 'bold')} className={`${btn(formats.bold)} font-bold`}>B</button>
        <button type="button" title="Italic" onMouseDown={(e) => action(e, 'italic')} className={`${btn(formats.italic)} italic`}>I</button>
        <button type="button" title="Underline" onMouseDown={(e) => action(e, 'underline')} className={`${btn(formats.underline)} underline`}>U</button>
        <span className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" title="Align left" onMouseDown={(e) => action(e, 'justifyLeft')} className={`${btn(formats.justifyLeft)} text-base`}>≡</button>
        <button type="button" title="Align centre" onMouseDown={(e) => action(e, 'justifyCenter')} className={`${btn(formats.justifyCenter)} text-base`}>≡</button>
        <button type="button" title="Align right" onMouseDown={(e) => action(e, 'justifyRight')} className={`${btn(formats.justifyRight)} text-base`}>≡</button>
        <span className="mx-1 h-6 w-px bg-gray-300" />
        <button type="button" title="Bullet list" onMouseDown={(e) => action(e, 'insertUnorderedList')} className={`${btn(formats.insertUnorderedList)} gap-1 text-[11px] font-bold`}>
          <span className="text-sm">●</span> List
        </button>
        <button type="button" title="Numbered list" onMouseDown={(e) => action(e, 'insertOrderedList')} className={`${btn(formats.insertOrderedList)} text-[11px] font-bold`}>
          1. List
        </button>
        <span className="mx-1 h-6 w-px bg-gray-300" />
        <select
          value={['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(formats.formatBlock) ? formats.formatBlock : 'p'}
          onChange={(e) => exec('formatBlock', e.target.value)}
          className={`h-8 min-w-[110px] rounded border-2 px-2 text-[11px] font-bold outline-none ${
            formats.formatBlock !== 'p' && formats.formatBlock !== 'div' ? 'border-[#3e8914] bg-[#3e8914]/10' : 'border-gray-300 bg-white'
          }`}
          aria-label="Text style"
        >
          <option value="p">Body Text</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="h4">Heading 4</option>
          <option value="h1">Heading 1</option>
          <option value="h5">Heading 5</option>
          <option value="h6">Heading 6</option>
        </select>
        <button type="button" title="Insert / remove link" onMouseDown={toggleLink} className={`${btn(false)} text-blue-600`}>
          <LinkIcon size={15} />
        </button>
        <span className="mx-1 h-6 w-px bg-gray-300" />
        <div className="flex h-8 items-center gap-2 rounded border-2 border-gray-300 bg-white px-2 shadow-sm">
          <Palette size={14} className="text-gray-500" />
          <input type="color" onChange={(e) => exec('foreColor', e.target.value)} className="h-5 w-6 cursor-pointer border-none bg-transparent p-0" title="Text colour" />
          <span className="h-4 w-px bg-gray-300" />
          <span className="font-mono text-[10px] font-bold text-gray-400">#</span>
          <input
            type="text"
            value={colorCode}
            maxLength={7}
            placeholder="Color Code"
            title="Type a hex code and press Enter"
            onChange={(e) => setColorCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                applyColorCode();
              }
            }}
            className="w-16 bg-transparent font-mono text-[10px] font-bold uppercase text-gray-700 outline-none"
          />
        </div>
      </div>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={onPaste}
        onMouseUp={refreshFormats}
        onKeyUp={refreshFormats}
        onFocus={refreshFormats}
        className="blog-editor max-w-none overflow-y-auto bg-white p-5 text-sm leading-relaxed text-gray-700 outline-none"
        style={{ minHeight }}
      />

      <style>{`
        .blog-editor:empty:before { content: attr(data-placeholder); color: #9ca3af; font-style: italic; pointer-events: none; }
        .blog-editor p { margin-bottom: 0.5rem; }
        .blog-editor a { color: #2563eb; text-decoration: underline; }
        .blog-editor ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .blog-editor ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .blog-editor b, .blog-editor strong { font-weight: 700; }
        .blog-editor h1 { font-size: 1.6rem; font-weight: 800; margin: 0.75rem 0; }
        .blog-editor h2 { font-size: 1.35rem; font-weight: 800; margin: 0.75rem 0; }
        .blog-editor h3 { font-size: 1.15rem; font-weight: 700; margin: 0.6rem 0; }
        .blog-editor h4, .blog-editor h5, .blog-editor h6 { font-weight: 700; margin: 0.5rem 0; }
      `}</style>
    </div>
  );
}
