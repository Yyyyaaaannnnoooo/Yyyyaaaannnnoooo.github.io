class QuestManager {
  constructor(npcs, player) {
    this.npcs = npcs;
    this.player = player;
    this.quests = {
      quest1: {
        id: "quest1",
        name: "Game Mechanics",
        status: "inactive",
        objectives: [
          { type: "talk", value: "npc5", diag: "part1", completed: false },
          // { type: "go_to", value: "first dither", completed: false },
          // { type: "talk", value: "npc1", diag: "part2", completed: false },
        ],
        currentObjectiveIndex: 0 // Track progress in sequence
      },
      quest2: {
        id: "quest2",
        name: "Meet The Dithers",
        status: "inactive",
        objectives: [
          { type: "talk", value: "npc1", diag: "part1", completed: false },
          { type: "talk", value: "npc2", diag: "part1", completed: false },
          { type: "talk", value: "npc3", diag: "part1", completed: false },
          { type: "talk", value: "npc4", diag: "part1", completed: false },
          { type: "talk", value: "npc5", diag: "part1", completed: false },
          { type: "talk", value: "npc6", diag: "part1", completed: false }
        ],
        currentObjectiveIndex: 0
      },
      quest3: {
        id: "quest3",
        name: "The Cursed Constants: A Ditherer's Burden",
        status: "inactive",
        requirements: ["quest1"],
        objectives: [
          { type: "talk", value: "npc1", diag: "part1", completed: false },
          { type: "talk", value: "npc2", diag: "part1", completed: false },
          { type: "talk", value: "npc3", diag: "part1", completed: false },
          { type: "talk", value: "npc4", diag: "part1", completed: false },
          { type: "talk", value: "npc5", diag: "part1", completed: false },
          { type: "talk", value: "npc6", diag: "part1", completed: false },
        ],
        currentObjectiveIndex: 0
      },
      quest4: {
        id: "quest4",
        name: "Gloomy Agents of Order: The War That Never Ended",
        status: "inactive",
        requirements: ["quest1"],
        objectives: [
          // { type: "go_to", value: "third dither", completed: false },
          { type: "talk", value: "npc1", diag: "part1", completed: false },
          { type: "talk", value: "npc2", diag: "part1", completed: false },
          { type: "talk", value: "npc3", diag: "part1", completed: false },
          { type: "talk", value: "npc4", diag: "part1", completed: false },
          { type: "talk", value: "npc6", diag: "part1", completed: false }
        ],
        currentObjectiveIndex: 0
      }
    };

    this.quest_list = Object.keys(this.quests);
    this.quests_progress = 0;
    this.activeQuests = new Set();
    this.current_quest = this.quest_list[this.quests_progress]
    
    this.html_name = document.querySelector(".quest-name");
    console.log(this.html_name);
    this.html_description = document.querySelector(".quest-text");
    this.activateQuest(this.current_quest)

  }

  activateQuest(questId) {
    if (this.quests_progress >= this.quest_list.length) {
      console.log('all quests completed');
    }
    if (this.quests[questId] && this.quests[questId].status === "inactive") {
      this.quests[questId].status = "active";
      this.activeQuests.add(questId);
      console.log(`🪼🪼 Quest Activated: ${this.quests[questId].name}`);
      // this.html_name.textContent = 

      this.update_html(questId);

    }
  }

  update_html(questId) {
    this.html_name.innerHTML = "";
    this.html_description.innerHTML = "";
    let p = document.createElement("p");
    p.textContent = `🪼🪼 Active Quest: ${this.quests[questId].name} 🪼🪼`
    this.html_name.appendChild(p);
    // calculate completion progress of quest
    let completion = this.quests[questId].objectives.filter(o => o.completed).length;
    console.log(completion);
    let total = this.quests[questId].objectives.length;
    let progress = Math.floor((completion / total) * 100);
    let p2 = document.createElement("p");
    p2.textContent = `Quest Progress: ${progress}%`
    this.html_description.appendChild(p2);

    this.quests[questId].objectives.forEach(objective => {
      let p = document.createElement("p");
      if (objective.completed) {
        p.textContent = `🧚🏼 ${objective.type} to ${objective.value}: ${this.npcs[objective.value].name}`;
      } else {
        p.textContent = `👹 ${objective.type} to ${objective.value}: ${this.npcs[objective.value].name}`;
      }
      this.html_description.appendChild(p);
    }
    )

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
    // console.log(questId, type, value);
    let quest = this.quests[questId];
    if (!quest || quest.status !== "active") {
      console.log('return');
      console.log('here there should be idle speak?');
      return;
    }

    
    let objective;
    switch (type) {
      case "talk":
        // console.log("case talk");
        // console.log(quest.objectives);
        objective = quest.objectives.find(o => {
          return o.type === "talk" && o.value === value
        });
        // console.log(objective);
        console.log(`✅ Objective Completed: ${type} ${value}`);
        objective.completed = true;
        this.update_html(questId);
        const next_objective = this.get_next_objective(questId)
        // console.log(next_objective);
        if (next_objective.type === "talk") {
          // console.log(npcs[next_objective.value]);
          const npc = this.npcs[next_objective.value];
          const part = next_objective.diag
          npc.set_dialogue_part(part)
        }
        break;
      case "go_to":
        objective = quest.objectives.find(o => o.type === "go_to" && o.value === value);
        break;
      case "collect":
        objective = quest.objectives.find(o => o.type === "collect" && o.value === value);
        if (objective) {
          objective.collected = (objective.collected || 0) + 1;
          if (objective.collected >= objective.amount) {
            objective.completed = true;
          }
        }
        break;
    }

    // If all objectives are completed, mark quest as finished
    if (quest.objectives.every(o => o.completed)) {
      quest.status = "completed";
      console.log(`🎉 Quest Completed: ${quest.name}`);
      this.deactivate_quest(questId);
      switch (questId) {
        case "quest1":
          // move to quest2
          this.progress_quests("quest2");
          break;
        case "quest2":
          // move to quest3
          this.progress_quests("quest3");
          break;
        case "quest3":
          // move to quest4
          this.progress_quests("quest4");
          break;

        default:
          break;
      }
      if (quest.onComplete) quest.onComplete();
    }
  }



  progress_quests(questId) {
    console.log("progress to quest: " + questId);
    this.activateQuest(questId);
    this.player.updateQuestProgress(questId);
    Object.keys(this.npcs).forEach(key => {
      const npc = this.npcs[key];
      // console.log(npc);
      npc.reset_dialogue_part();
    })
  }
}

export { QuestManager }