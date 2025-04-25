import * as THREE from 'three';
class Player {
  // he also requires some quest like things
  constructor(name, camera) {
    this.name = name;
    this.camera = camera
    this.currentQuest = "quest1"; // Starts with quest 1\
    this.locations = {
      quest1: { pos: new THREE.Vector2(10, 10), name: "first dither" },
      quest3: { pos: new THREE.Vector2(10, -10), name: "second dither" },
      quest4: { pos: new THREE.Vector2(-10, 10), name: "third dither" },
    };
    this.onLocationReached = (location, questId) => {
      questManager.updateQuest(questId, "go_to", location);
    }
    this.geom = new THREE.BoxGeometry(0.5, 300, 0.5);
    this.mat = new THREE.MeshBasicMaterial();
    this.mesh = new THREE.Mesh(this.geom, this.mat)
    this.mesh.position.x = this.locations[this.currentQuest].pos.x
    this.mesh.position.z = this.locations[this.currentQuest].pos.y
  }

  show_debug(scene) {
    scene.add(this.mesh)
  }

  set_current_quest(questId) {
    this.currentQuest = questId
  }

  update_debug_position() {
    this.mesh.position.x = this.locations[this.currentQuest].pos.x
    this.mesh.position.z = this.locations[this.currentQuest].pos.y
  }

  talkTo(npc) {
    if (npc) {
      console.log(`talking to npc: ${npc.name}`);
      npc.talk(this.currentQuest);
    }
  }

  updateQuestProgress(questId) {
    // Check if any new quests have started
    this.currentQuest = questId; // Set active quest
    if (!this.locations[this.currentQuest]) return
    this.update_debug_position()
    // console.log(questManager.activeQuests);
    // questManager.activeQuests.forEach(questId => {
    //   // console.log(object);
    // });
  }

  check_location(camera) {
    if (!this.locations[this.currentQuest]) return
    const pos = this.locations[this.currentQuest].pos;
    // console.log(pos);
    const player_pos = new THREE.Vector2(camera.position.x, camera.position.z);
    const dist = player_pos.distanceTo(pos);
    // console.log(dist);
    if (dist < 3) {
      console.log('location reached');
      this.onLocationReached(this.locations[this.currentQuest].name, this.currentQuest)
    }
  }
}

export {Player}