import { Plugin, PluginKey } from "prosemirror-state";
import { getBlockInfo } from "../../../api/getBlockInfoFromPos.js";

// 定义编号格式类型
type NumberingStyle = "numeric" | "alpha" | "roman";

// 转换数字为字母 (1 -> 'a', 2 -> 'b' 等)
const numberToAlpha = (num: number): string => {
  // 确保数字在有效范围内 (1-26)
  if (num <= 0) return 'a';
  if (num > 26) num = ((num - 1) % 26) + 1;
  return String.fromCharCode(96 + num);
};

// 转换数字为罗马数字
const numberToRoman = (num: number): string => {
  if (num <= 0) return 'i';
  
  // 使用模运算确保数字在1-15范围内循环
  num = ((num - 1) % 15) + 1;
  
  const romanNumerals = [
    'i', 'ii', 'iii', 'iv', 'v',
    'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv'
  ];
  
  return romanNumerals[num - 1];
};

// 根据嵌套层级获取编号样式
const getNumberingStyleForLevel = (level: number): NumberingStyle => {
  const styles: NumberingStyle[] = ["numeric", "alpha", "roman"];
  return styles[level % 3];
};

// 格式化编号
const formatNumber = (num: number, style: NumberingStyle): string => {
  try {
    switch (style) {
      case "alpha":
        return numberToAlpha(num);
      case "roman":
        return numberToRoman(num);
      case "numeric":
      default:
        return num.toString();
    }
  } catch (error) {
    console.error('Error formatting number:', error);
    // 发生错误时返回安全的默认值
    return style === 'alpha' ? 'a' : 
           style === 'roman' ? 'i' : 
           '1';
  }
};

// 添加从字母转回数字的函数
const alphaToNumber = (alpha: string): number => {
  if (!alpha.match(/^[a-z]$/)) return 1;
  return alpha.charCodeAt(0) - 96;
};

// 添加从罗马数字转回数字的函数
const romanToNumber = (roman: string): number => {
  if (!roman) return 1;
  
  const romanNumerals = [
    'i', 'ii', 'iii', 'iv', 'v',
    'vi', 'vii', 'viii', 'ix', 'x',
    'xi', 'xii', 'xiii', 'xiv', 'xv'
  ];
  
  const index = romanNumerals.indexOf(roman.toLowerCase());
  return index === -1 ? 1 : index + 1;
};

// 添加获取数值的函数
const getNumberValue = (index: string): number => {
  // 如果是数字格式
  if (index.match(/^[0-9]+$/)) {
    return parseInt(index);
  }

  // 罗马数字的模式
  const romanPattern = /^(i{1,3}|iv|v|vi{1,3}|ix|x|xi{1,3}|xiv|xv)$/;
  
  // 如果匹配罗马数字模式
  if (index.toLowerCase().match(romanPattern)) {
    return romanToNumber(index);
  }
  
  // 如果是单个字母（包括i），则视为字母编号
  if (index.match(/^[a-z]$/)) {
    return alphaToNumber(index);
  }
  
  // 默认返回1
  return 1;
};

const PLUGIN_KEY = new PluginKey(`numbered-list-indexing`);
export const NumberedListIndexingPlugin = () => {
  return new Plugin({
    key: PLUGIN_KEY,
    appendTransaction: (_transactions, _oldState, newState) => {
      const tr = newState.tr;
      tr.setMeta("numberedListIndexing", true);

      let modified = false;

      newState.doc.descendants((node, pos) => {
        if (
          node.type.name === "blockContainer" &&
          node.firstChild!.type.name === "numberedListItem"
        ) {
          let newIndex = "1";
          let nestingLevel = 0;

          const blockInfo = getBlockInfo({
            posBeforeNode: pos,
            node,
          });

          // 修改计算嵌套层级的逻辑
          let currentPos = pos;
          let currentLevel = 0;
          
          // 向上遍历文档结构，计算实际的嵌套层级
          while (currentPos > 0) {
            const resolvedPos = tr.doc.resolve(currentPos);
            if (resolvedPos.depth <= 1) break;
            
            const parentNode = resolvedPos.node(resolvedPos.depth - 1);
            if (parentNode.type.name === "blockContainer") {
              const parentContent = parentNode.firstChild;
              if (parentContent && parentContent.type.name === "numberedListItem") {
                currentLevel++;
              }
            }
            currentPos = resolvedPos.before(resolvedPos.depth);
          }
          
          nestingLevel = currentLevel;

          const prevBlock = tr.doc.resolve(
            blockInfo.blockContainer.beforePos
          ).nodeBefore;

          if (prevBlock) {
            const prevBlockInfo = getBlockInfo({
              posBeforeNode:
                blockInfo.blockContainer.beforePos - prevBlock.nodeSize,
              node: prevBlock,
            });

            const isPrevBlockOrderedListItem =
              prevBlockInfo.blockContent.node.type.name === "numberedListItem";

            if (isPrevBlockOrderedListItem) {
              const prevIndex = prevBlockInfo.blockContent.node.attrs["index"];
              const prevNumber = getNumberValue(prevIndex);
              newIndex = formatNumber(
                prevNumber + 1,
                getNumberingStyleForLevel(nestingLevel)
              );
            } else {
              newIndex = formatNumber(1, getNumberingStyleForLevel(nestingLevel));
            }
          } else {
            newIndex = formatNumber(1, getNumberingStyleForLevel(nestingLevel));
          }

          const contentNode = blockInfo.blockContent.node;
          const index = contentNode.attrs["index"];

          if (index !== newIndex) {
            modified = true;
            tr.setNodeMarkup(blockInfo.blockContent.beforePos, undefined, {
              index: newIndex,
            });
          }
        }
      });

      return modified ? tr : null;
    },
  });
};
