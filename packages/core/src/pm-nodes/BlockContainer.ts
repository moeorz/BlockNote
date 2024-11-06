import { Node } from "@tiptap/core";

import type { BlockNoteEditor } from "../editor/BlockNoteEditor.js";
import { BlockNoteDOMAttributes } from "../schema/index.js";
import { mergeCSSClasses } from "../util/browser.js";

// Object containing all possible block attributes.
const BlockAttributes: Record<string, string> = {
  blockColor: "data-block-color",
  blockStyle: "data-block-style",
  alias: "data-alias",
  id: "data-id",
  depth: "data-depth",
  depthChange: "data-depth-change",
};

/**
 * The main "Block node" documents consist of
 */
export const BlockContainer = Node.create<{
  domAttributes?: BlockNoteDOMAttributes;
  editor: BlockNoteEditor<any, any, any>;
}>({
  name: "blockContainer",
  group: "blockContainer",
  content: "blockContent blockGroup?",
  priority: 50,
  defining: true,

  addAttributes() {
    return {
      alias: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-alias"),
        renderHTML: (attributes) => ({
          "data-alias": attributes.alias,
        }),
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
        getAttrs: (element) => {
          if (typeof element === "string") {
            return false;
          }

          const attrs: Record<string, string> = {};
          for (const [nodeAttr, HTMLAttr] of Object.entries(BlockAttributes)) {
            if (element.getAttribute(HTMLAttr)) {
              attrs[nodeAttr] = element.getAttribute(HTMLAttr)!;
            }
          }

          if (element.getAttribute("data-node-type") === "blockContainer") {
            return attrs;
          }

          return false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const blockOuter = document.createElement("div");
    blockOuter.className = "bn-block-outer";
    blockOuter.setAttribute("data-node-type", "blockOuter");
    
    if (HTMLAttributes.alias) {
      blockOuter.setAttribute("data-alias", HTMLAttributes.alias);
    }
    
    for (const [attribute, value] of Object.entries(HTMLAttributes)) {
      if (attribute !== "class") {
        blockOuter.setAttribute(attribute, value);
      }
    }

    const blockHTMLAttributes = {
      ...(this.options.domAttributes?.block || {}),
      ...HTMLAttributes,
    };
    
    const block = document.createElement("div");
    block.className = mergeCSSClasses("bn-block", blockHTMLAttributes.class);
    block.setAttribute("data-node-type", this.name);
    
    if (blockHTMLAttributes.alias) {
      block.setAttribute("data-alias", blockHTMLAttributes.alias);
    }
    
    for (const [attribute, value] of Object.entries(blockHTMLAttributes)) {
      if (attribute !== "class") {
        block.setAttribute(attribute, value);
      }
    }

    blockOuter.appendChild(block);

    return {
      dom: blockOuter,
      contentDOM: block,
    };
  },
});
