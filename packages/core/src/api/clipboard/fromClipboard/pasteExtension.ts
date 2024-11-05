import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";

import type { BlockNoteEditor } from "../../../editor/BlockNoteEditor";
import {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from "../../../schema/index.js";
import { nestedListsToBlockNoteStructure } from "../../parsers/html/util/nestedLists.js";
import { acceptedMIMETypes } from "./acceptedMIMETypes.js";
import { handleFileInsertion } from "./handleFileInsertion.js";
import { handleVSCodePaste } from "./handleVSCodePaste.js";

// 检查是否为有效的 URL
function isValidURL(str: string) {
  const pattern = new RegExp('^(https?:\\/\\/)?'+ // 协议
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // 域名
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // 或 IP (v4) 地址
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // 端口和路径
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // 查询字符串
    '(\\#[-a-z\\d_]*)?$','i'); // 锚点
  return !!pattern.test(str);
}

// 检查 URL 是否指向图片
function isImageURL(url: string) {
  return /\.(jpeg|jpg|gif|png|svg|webp)$/i.test(url);
}

// 将纯链接转换为 Markdown 格式的链接或图片
function convertLinksToMarkdown(text: string): string {
  return text.split('\n').map(line => {
    line = line.trim();
    if (isValidURL(line)) {
      if (isImageURL(line)) {
        return `![](${line})`;
      } else {
        return `[${line}](${line})`;
      }
    }
    return line;
  }).join('\n');
}

export const createPasteFromClipboardExtension = <
  BSchema extends BlockSchema,
  I extends InlineContentSchema,
  S extends StyleSchema
>(
  editor: BlockNoteEditor<BSchema, I, S>
) =>
  Extension.create<{ editor: BlockNoteEditor<BSchema, I, S> }, undefined>({
    name: "pasteFromClipboard",
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("paste"),
          props: {
            handlePaste: (view, event) => {
              const clipboardData = event.clipboardData;
              if (!clipboardData) return false;

              // 获取粘贴内容的格式
              let format: (typeof acceptedMIMETypes)[number] | undefined;
              for (const mimeType of acceptedMIMETypes) {
                if (clipboardData.types.includes(mimeType)) {
                  format = mimeType;
                  break;
                }
              }

              // 检查当前是否在代码块内
              const isInCodeBlock = editor._tiptapEditor.isActive("codeBlock");
              
              if (isInCodeBlock) {
                // 获取纯文本内容
                const text = clipboardData.getData("text/plain");
                if (!text) return false;

                // 直接插入文本内容
                view.dispatch(
                  view.state.tr.insertText(text, view.state.selection.from)
                );
                
                // 阻止默认粘贴行为
                event.preventDefault();
                return true;
              }

              // 非代码块内的粘贴处理
              if (!format) {
                return true;
              }

              if (format === "vscode-editor-data") {
                handleVSCodePaste(event, editor);
                return true;
              }

              if (format === "Files") {
                handleFileInsertion(event, editor);
                return true;
              }

              let data = clipboardData.getData(format);

              if (format === "blocknote/html") {
                editor._tiptapEditor.view.pasteHTML(data);
                return true;
              }

              if (format === "text/html") {
                const htmlNode = nestedListsToBlockNoteStructure(data.trim());
                data = htmlNode.innerHTML;
                editor._tiptapEditor.view.pasteHTML(data);
                return true;
              }
              
              // 在解析 Markdown 之前，先将纯链接转换为 Markdown 格式
              if (format === "text/plain") {
                data = convertLinksToMarkdown(data);
              }
              
              // Markdown 解析逻辑
              editor.tryParseMarkdownToBlocks(data).then(blocks => {
                if (blocks) {
                  const selection = editor.getSelection();
                  if (selection && selection.blocks.length > 0) {
                    // 如果有选中区域，替换选中区域
                    const blockIds = selection.blocks.map(block => block.id);
                    editor.replaceBlocks(blockIds, blocks);
                  } else {
                    // 如果没有选中区域，获取光标位置
                    const cursorPosition = editor.getTextCursorPosition();
                    if (cursorPosition) {
                      const currentBlockId = cursorPosition.block.id;
                      const currentBlock = editor.getBlock(currentBlockId);
                      const isBlockEmpty = currentBlock && Array.isArray(currentBlock.content) && currentBlock.content.length === 0;

                      if (isBlockEmpty) {
                        // 如果当前块的文本内容为空，移除当前块
                        editor.replaceBlocks([currentBlockId], blocks);
                      } else {
                        // 在当前光标block后进行插入
                        editor.insertBlocks(blocks, currentBlockId, "after");
                      }
                    } else {
                      // 如果没有光标位置，使用默认插入逻辑
                      editor.insertBlocks(blocks, editor.document[0].id, "after");
                    }
                  }
                } else {
                  editor._tiptapEditor.view.pasteText(data);
                }
              }).catch(error => {
                console.error("Error parsing markdown:", error);
                editor._tiptapEditor.view.pasteText(data);
              });

              return true;
            }
          }
        })
      ];
    },
  });
