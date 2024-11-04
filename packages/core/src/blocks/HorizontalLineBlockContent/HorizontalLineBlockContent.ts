import {
  createBlockSpecFromStronglyTypedTiptapNode,
  createStronglyTypedTiptapNode,
} from "../../schema/index.js";
import { createDefaultBlockDOMOutputSpec } from "../defaultBlockHelpers.js";
import { InputRule } from "@tiptap/core";
import { getBlockInfoFromSelection } from "../../api/getBlockInfoFromPos.js";
import { updateBlockCommand } from "../../api/blockManipulation/commands/updateBlock/updateBlock.js";

const HorizontalLineContent = createStronglyTypedTiptapNode({
  name: "horizontalLine",
  content: "",
  group: "blockContent",
  marks: "",
  defining: true,

  parseHTML() {
    return [
      {
        tag: "div[data-content-type=" + this.name + "]",
      },
      {
        tag: "hr",
      },
    ];
  },

  renderHTML() {
    const hr = document.createElement("hr");
    const { dom } = createDefaultBlockDOMOutputSpec(
      this.name,
      "div",
      {},
      {}
    );
    
    dom.appendChild(hr);

    return {
      dom,
    };
  },

  addInputRules() {
    return [
      new InputRule({
        find: /^(?:---|___|\*\*\*)\s$/,
        handler: ({ state, chain, range }) => {
          const blockInfo = getBlockInfoFromSelection(state);
          if (blockInfo.blockContent.node.type.spec.content !== "inline*") {
            return;
          }

          chain()
            .command(
              updateBlockCommand(
                this.options.editor,
                blockInfo.blockContainer.beforePos,
                {
                  type: "horizontalLine",
                  props: {},
                }
              )
            )
            // 删除用于创建水平线的字符
            .deleteRange({ from: range.from, to: range.to })
            .run();
        },
      }),
    ];
  },
});

export const HorizontalLine = createBlockSpecFromStronglyTypedTiptapNode(
  HorizontalLineContent,
  {}
); 