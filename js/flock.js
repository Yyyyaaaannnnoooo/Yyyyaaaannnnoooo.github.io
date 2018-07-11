class Flock {

    constructor(img, num) {
        this.mouse = createVector();
        this.agents = [];
        for (let i = 0; i < num; i++) {
            this.agents.push(new Agent(random(width), random(height), img));
        }
    }
    show() {
        // noFill();
        // strokeWeight(2);
        // stroke('#00CCFF');
        // beginShape();
        // for (let i = 0; i < this.agents.length; i++) {
        //     // this.agents[i].show();
        //     vertex(this.agents[i].pos.x, this.agents[i].pos.y);
        // }
        // endShape();
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].show();
        }
    }
    update() {
        this.mouse = createVector(mouseX, mouseY);
        for (let i = 0; i < this.agents.length; i++) {
            this.agents[i].settarget(this.mouse);
            this.agents[i].applyBehaviors(this.agents);
            this.agents[i].update();
        }
    }
}