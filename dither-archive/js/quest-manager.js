class QuestManager {
  constructor() {
    this.quests = {
      quest1: {
        id: "quest1",
        name: "Game Mechanics",
        status: "inactive",
        objectives: [
          { type: "talk", value: "npc1", diag: "part1", completed: false },
          { type: "go_to", value: "first dither", completed: false },
          { type: "talk", value: "npc1", diag: "part2", completed: false },
        ],
        currentObjectiveIndex: 0 // Track progress in sequence
      },
      quest2: {
        id: "quest2",
        name: "Meet The Dithers",
        status: "inactive",
        objectives: [
          { type: "talk", value: "npc1", diag: "part1", completed: false },
          // { type: "talk", value: "npc2", completed: false },
          { type: "talk", value: "npc3", diag: "part1", completed: false },
          { type: "talk", value: "npc4", diag: "part1", completed: false },
          // { type: "talk", value: "npc5", completed: false },
          // { type: "talk", value: "npc6", completed: false }
        ],
        currentObjectiveIndex: 0
      },
      quest3: {
        id: "quest3",
        name: "Return to NPC3",
        status: "inactive",
        requirements: ["quest1"],
        objectives: [
          { type: "talk", value: "npc3", diag: "part1", completed: false },
          { type: "go_to", value: "second dither", completed: false },
          { type: "talk", value: "npc1", diag: "part1", completed: false }
        ],
        currentObjectiveIndex: 0
      },
      quest4: {
        id: "quest4",
        name: "The Next Step",
        status: "inactive",
        requirements: ["quest1"],
        objectives: [
          { type: "talk", value: "npc4", diag: "part1",completed: false },
          { type: "go_to", value: "third dither", completed: false },
          { type: "talk", value: "npc3", diag: "part1",completed: false }
        ],
        currentObjectiveIndex: 0
      }
    };

    this.quest_list = Object.keys(this.quests);
    this.quests_progress = 0;
    console.log(this.quest_list);
    this.activeQuests = new Set();
    this.current_quest = this.quest_list[this.quests_progress]
    this.activateQuest(this.current_quest)
  }

  activateQuest(questId, npcId) {
    if(this.quests_progress >= this.quest_list.length){
      console.log('all quests completed');
    }
    if (this.quests[questId] && this.quests[questId].status === "inactive") {
      this.quests[questId].status = "active";
      this.activeQuests.add(questId);
      console.log(`Quest Activated: ${this.quests[questId].name}`);
    }
  }

  deactivate_quest(questId) {
    this.activeQuests.delete(questId)
  }

  get_next_objective(questId) {
    let next_objective_index = this.quests[questId].currentObjectiveIndex + 1;
    if (next_objective_index >= this.quests[questId].objectives.length) {
      next_objective_index = this.quests[questId].objectives.length - 1
    }
    return this.quests[questId].objectives[next_objective_index]
  }

  move_to_next_quest() {

  }

  updateQuest(questId, type, value) {
    console.log(questId, type, value);
    let quest = this.quests[questId];
    if (!quest || quest.status !== "active") {
      console.log('return');
      return;
    }

    let currentObjective = quest.objectives[quest.currentObjectiveIndex];
    console.log(currentObjective);
    if (!currentObjective) return; // No more objectives


    if ((type === currentObjective.type && value === currentObjective.value)
      && !currentObjective.completed) {
      currentObjective.completed = true;
      console.log(`✅ Objective Completed: ${type} ${value}`);
      // Move to the next objective
      quest.currentObjectiveIndex++;
      if (quest.currentObjectiveIndex >= quest.objectives.length) {
        quest.status = "completed";
        console.log(`🎉 Quest Completed: ${quest.name}`);

        if (quest.onComplete) quest.onComplete();
      }
    } else {
      console.log(`🚫 You need to complete the previous step first!`);
    }
    // let objective = quest.objectives.find(o => o.npc === npcId);
    // console.log(objective);

    // let objective;
    // switch (type) {
    //   case "talk":
    //     objective = quest.objectives.find(o => o.type === "talk" && o.npc === value);
    //     break;
    //   case "go_to":
    //     objective = quest.objectives.find(o => o.type === "go_to" && o.location === value);
    //     break;
    //   case "collect":
    //     objective = quest.objectives.find(o => o.type === "collect" && o.item === value);
    //     if (objective) {
    //       objective.collected = (objective.collected || 0) + 1;
    //       if (objective.collected >= objective.amount) {
    //         objective.completed = true;
    //       }
    //     }
    //     break;
    // }

    // // If all objectives are completed, mark quest as finished
    // if (quest.objectives.every(o => o.completed)) {
    //   quest.status = "completed";
    //   console.log(`Quest Completed: ${quest.name}`);
    //   // this.deactivate_quest(questId)
    //   if (quest.onComplete) quest.onComplete();
    // }
  }
}

export { QuestManager }