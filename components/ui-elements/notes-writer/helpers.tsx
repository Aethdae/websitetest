import { FC } from "react";
import { Editor, Element, Node, Point, Range, Transforms } from "slate";
import { BaseEditor, Descendant } from "slate";
import { ReactEditor, RenderElementProps } from "slate-react";
import { CustomTextType, RenderText, TextType } from "./CustomText";
import { BlockQuoteType, blockQuote } from "./BlockQuote";
import { HeadingType, heading } from "./Heading";
import {
  BulletedListType,
  ListItemType,
  bulletedList,
  listItems,
} from "./ListItem";
import { TodoType, todo } from "./Todo";
import { Nullable } from "@/helpers/types/data";

type ElementTypeNames =
  | "paragraph"
  | "list-item"
  | "todo"
  | "block-quote"
  | "bulleted-list"
  | "heading";

type ElementTypes =
  | TextType
  | ListItemType
  | TodoType
  | BlockQuoteType
  | BulletedListType
  | HeadingType;

const SHORTCUTS: { [key: string]: ElementTypeNames } = [
  listItems,
  todo,
  blockQuote,
  heading,
].reduce((prev, curr) => ({ ...prev, ...curr.shortcuts }), {});

const mapTextChildren = (note: { children: { text: string }[] }) =>
  note.children.map(({ text }) => text).join("");

export const transformNotesToMd = (notes: Descendant[]): string =>
  notes
    .map((note) =>
      !("type" in note)
        ? !("children" in note)
          ? note.text
          : ""
        : note.type === "bulleted-list"
        ? note.children.map(
            (child) => `- ${child.children.map((val) => val.text).join("")}`
          )
        : note.type === "todo"
        ? `${note.done ? "[x]" : "[]"} ${mapTextChildren(note)}`
        : note.type === "block-quote"
        ? `> ${mapTextChildren(note)}`
        : note.type === "heading"
        ? `${"#".repeat(note.level)} ${mapTextChildren(note)}`
        : mapTextChildren(note)
    )
    .join("\n");

const replaceShortcut = (
  note: string,
  shortcut: string,
  type: ElementTypeNames
) => [{ text: type === "paragraph" ? note : note.replace(`${shortcut} `, "") }];

export const transformMdToNotes = (notes: Nullable<string>) => {
  if (!notes || notes === "") return initialValue;

  const splittedNotes = notes.split("\n");
  const nodes = [] as ElementTypes[];
  for (let i = 0; i < splittedNotes.length; i++) {
    const note = splittedNotes[i];
    const startsWith = note.split(" ")[0];
    const type = SHORTCUTS[startsWith] || "paragraph";

    const props = {
      type,
      level: type === "heading" ? startsWith.length : undefined,
      done: type === "todo" ? startsWith === "[x]" : undefined,
      children: replaceShortcut(note, startsWith, type),
    } as ElementTypes;

    if (props.type === "list-item") {
      if (nodes.length > 0) {
        const lastItem = nodes[nodes.length - 1];
        if (lastItem.type === "bulleted-list") {
          lastItem.children = [...lastItem.children, props as ListItemType];
        }
      } else {
        nodes.push({
          type: "bulleted-list",
          children: [props as ListItemType],
        });
      }
    } else {
      nodes.push(props);
    }
  }
  return nodes;
};

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor & ReactEditor;
    Element: ElementTypes;
    Text: CustomTextType;
  }
}

export const renderElement = (props: RenderElementProps) => (
  <RenderElement {...props} />
);

const RenderElement: FC<RenderElementProps> = (props) => {
  const mapRenderElement: { [k: string]: FC<RenderElementProps> } = [
    blockQuote,
    heading,
    todo,
    listItems,
    bulletedList,
  ].reduce((prev, curr) => ({ ...prev, ...curr.mapRenderer }), {});
  const UiElement = mapRenderElement[props.element.type] || RenderText;
  return <UiElement {...props} />;
};

export const onDomBeforeInput =
  (editor: ReactEditor) => (event: InputEvent) => {
    queueMicrotask(() => {
      const pendingDiffs = ReactEditor.androidPendingDiffs(editor);
      const scheduleFlush = pendingDiffs?.some(({ diff, path }) => {
        if (!diff.text.endsWith(" ")) return false;

        const { text } = Node.leaf(editor, path);
        const beforeText = text.slice(0, diff.start) + diff.text.slice(0, -1);
        if (!(beforeText in SHORTCUTS)) return;

        const blockEntry = Editor.above(editor, {
          at: path,
          match: (node) =>
            Element.isElement(node) && Editor.isBlock(editor, node),
        });
        if (!blockEntry) return false;

        const [, blockPath] = blockEntry;
        return Editor.isStart(editor, Editor.start(editor, path), blockPath);
      });

      if (scheduleFlush) ReactEditor.androidScheduleFlush(editor);
    });
  };

export const withShortCuts = (editor: ReactEditor) => {
  const { deleteBackward, insertText } = editor;

  editor.insertText = (text: string) => {
    const { selection } = editor;

    if (text.endsWith(" ") && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection;

      const block = Editor.above(editor, {
        match: (node) =>
          Element.isElement(node) && Editor.isBlock(editor, node),
      });
      const path = block ? block[1] : [];
      const start = Editor.start(editor, path);
      const range = { anchor, focus: start };
      const beforeText = Editor.string(editor, range) + text.slice(0, -1);
      const type = SHORTCUTS[beforeText];

      if (type) {
        Transforms.select(editor, range);

        if (!Range.isCollapsed(range)) {
          Transforms.delete(editor);
        }

        const propsMapper: { [k: string]: (text: string) => Partial<Element> } =
          [heading, todo].reduce(
            (prev, curr) => ({ ...prev, ...(curr.mapProps || {}) }),
            {}
          );

        const newProps: Partial<Element> = propsMapper[type]
          ? propsMapper[type](beforeText)
          : {
              type,
            };
        Transforms.setNodes<Element>(editor, newProps, {
          match: (node) =>
            Element.isElement(node) && Editor.isBlock(editor, node),
        });

        const wrapperFn: { [key: string]: (editor: ReactEditor) => void } = [
          listItems,
        ].reduce(
          (prev, curr) => ({ ...prev, ...(curr.mapWrapperFn || {}) }),
          {}
        );
        if (wrapperFn[type]) wrapperFn[type](editor);

        return;
      }
    }
    insertText(text);
  };

  editor.deleteBackward = (...args) => {
    const { selection } = editor;

    if (selection && Range.isCollapsed(selection)) {
      const match = Editor.above(editor, {
        match: (node) =>
          Element.isElement(node) && Editor.isBlock(editor, node),
      });

      if (match) {
        const [block, path] = match;
        const start = Editor.start(editor, path);

        if (
          !Editor.isEditor(block) &&
          Element.isElement(block) &&
          block.type !== "paragraph" &&
          Point.equals(selection.anchor, start)
        ) {
          const newProps: Partial<Element> = { type: "paragraph" };
          Transforms.setNodes(editor, newProps);

          if (block.type === "list-item") {
            Transforms.unwrapNodes(editor, {
              match: (node) =>
                !Editor.isEditor(node) &&
                Element.isElement(node) &&
                node.type === "bulleted-list",
              split: true,
            });
          }

          return;
        }
      }
      deleteBackward(...args);
    }
  };

  return editor;
};

export const initialValue: TextType[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];

export const noteHasContent = (notes: Descendant[]): boolean =>
  notes.filter(
    (note) =>
      "children" in note &&
      note.children &&
      note.children.filter((child) =>
        "text" in child
          ? child.text && child.text.trim().length > 0
          : child.children.length > 0
      ).length > 0
  ).length > 0;
