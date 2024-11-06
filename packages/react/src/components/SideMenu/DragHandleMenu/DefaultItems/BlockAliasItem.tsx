import {
    BlockSchema,
    DefaultBlockSchema,
    DefaultInlineContentSchema,
    DefaultStyleSchema,
    InlineContentSchema,
    StyleSchema,
  } from "@blocknote/core";
  import { ReactNode } from "react";
  
  import { useComponentsContext } from "../../../../editor/ComponentsContext.js";
  import { useBlockNoteEditor } from "../../../../hooks/useBlockNoteEditor.js";
  import { DragHandleMenuProps } from "../DragHandleMenuProps.js";
  
  export const BlockAliasItem = <
    BSchema extends BlockSchema = DefaultBlockSchema,
    I extends InlineContentSchema = DefaultInlineContentSchema,
    S extends StyleSchema = DefaultStyleSchema
  >(
    props: DragHandleMenuProps<BSchema, I, S> & {
      children: ReactNode;
    }
  ) => {
    const Components = useComponentsContext()!;
  
    const editor = useBlockNoteEditor<BSchema, I, S>();
  
    return (
      <Components.Generic.Menu.Item
        className={"bn-menu-item"}
        onClick={() => {
            //TODO: 生成一个随机字符串作为alias
            editor.setBlockAlias(props.block.id, `vars-${Math.random().toString(36).substring(2, 6)}`);
        }}>
        {props.children}
      </Components.Generic.Menu.Item>
    );
  };
  