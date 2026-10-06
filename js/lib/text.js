export function textBlocks(text) {
  const blocks = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.trim() === '') {
      current = null;
    } else if (line.startsWith('- ')) {
      if (current?.type !== 'list') {
        current = { type: 'list', items: [] };
        blocks.push(current);
      }
      current.items.push(line.slice(2));
    } else if (current?.type === 'paragraph') {
      current.text += `\n${line}`;
    } else {
      current = { type: 'paragraph', text: line };
      blocks.push(current);
    }
  }
  return blocks;
}
