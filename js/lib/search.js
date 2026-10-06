export function matches(question, phrase) {
  // Joined with a line break, so a word cannot start in one field and end in the next.
  const text = normalize([question.question, question.answer, question.notes].join('\n'));
  const words = normalize(phrase).match(/\S+/g) ?? [];
  return words.every((word) => text.includes(word));
}

// NFD splits "ą" into "a" and a combining mark, but "ł" is a letter of its own.
function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ł', 'l');
}
