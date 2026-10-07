/** Words too common to give a title away on their own. */
const COMMON_WORDS = new Set(
  (
    "a an the and or but of to in on at for with from by as is it its be am are was were i me my " +
    "you your we us our he him his she her they them their this that these those do does did not " +
    "no so if up out all one"
  ).split(" "),
);

const words = (text: string) => text.toLowerCase().match(/[a-z0-9']+/g) ?? [];

/**
 * True when a written clue uses a distinctive word from the song's title.
 * The clue stands in for the audio, so it must describe the song without
 * naming it.
 */
export function clueLeaksAnswer(clue: string, title: string): boolean {
  const titleWords = words(title);
  const distinctive = titleWords.filter((word) => !COMMON_WORDS.has(word));
  // A title made only of common words ("You and I") counts every word.
  const watched = new Set(distinctive.length > 0 ? distinctive : titleWords);
  return words(clue).some((word) => watched.has(word));
}
