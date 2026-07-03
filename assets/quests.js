// HUNT_X quest list — each quest is a real-world object the AI checks for.
// Add/remove/reorder quests here to change the hunt.
const QUESTS = [
  { id: "mug", label: "THE MUG", target: "a coffee mug or cup", xp: 50 },
  { id: "plant", label: "THE PLANT", target: "a houseplant or potted plant", xp: 60 },
  { id: "book", label: "A BOOK", target: "a book", xp: 40 },
  { id: "shoe", label: "A SHOE", target: "a shoe or sneaker", xp: 70 },
];

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem("huntx_progress") || "[]");
  } catch (e) {
    return [];
  }
}

function markComplete(questId) {
  const progress = getProgress();
  if (!progress.includes(questId)) {
    progress.push(questId);
    localStorage.setItem("huntx_progress", JSON.stringify(progress));
  }
}

function getTotalXP() {
  const progress = getProgress();
  return QUESTS.filter((q) => progress.includes(q.id)).reduce((sum, q) => sum + q.xp, 0);
}

function getNextQuest() {
  const progress = getProgress();
  const next = QUESTS.find((q) => !progress.includes(q.id));
  return next || QUESTS[0]; // loop back to start once all are done
}

function getQuestById(id) {
  return QUESTS.find((q) => q.id === id) || QUESTS[0];
}
