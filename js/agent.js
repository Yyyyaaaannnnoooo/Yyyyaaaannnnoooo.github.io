class Agent {
    /**
     * Agent constructor
     * @param {float} x - pos on the x axis
     * @param {float} y - pos on y axis
     * @param {char} _chr - the char to be displayed
     */
    constructor(x, y, _img) {
        this.pos = createVector(x, y),
            this.target = createVector();
            this.vel = createVector();
            this.acc = createVector();
            this.r = floor(random(20, 40));
            this.speed = 1.5;
            this.force = 0.07;
            // this.img = createImage(_img.width, _img.height);
            // console.log(this.img.pixels, _img.pixels);
            // this.img.pixels = _img.pixels;
            // console.log(this.img.pixels);
            this.img = loadImage('./cursor.svg', success => {
                // flock = new Flock(arrow, 10);
                console.log('success')
              }, err => console.error(err));
    }
    /**
     * show the agent as circle with a directional nose
     */
    show() {
        // textSize(this.r);
        // fill('#FF5500');
        // noStroke();
        //stroke(0, 255, 0);

        this.img.resize(0, this.r);
        let theta = this.vel.heading();
        push();
        translate(this.pos.x, this.pos.y);
        rotate(theta + PI/2);
        //line(0, 0, 0, -this.r * 2);
        // text(this.chr, -this.r / 4, this.r / 4);
        // ellipse(0, 0, this.r, this.r);
        image(this.img, 0, 0);
        pop();
    }
    /**
     * update the agent position according to vector math
     */
    update() {
        // Update this.velocity
        this.vel.add(this.acc);
        // Limit this.speed
        this.vel.limit(this.speed);
        this.pos.add(this.vel);
        // Reset accelertion to 0 each cycle
        this.acc.mult(0);
    }
    /**
     * set a new this.target for the agent
     * @param {PVector} p - vector element of the this.pos to reach
     */
    settarget(p) {
        this.target = p;
        // this.target.add(p);
    }
    /**
     * returns the radius of the agent
     */
    getRadius() {
        return this.r;
    }
    //returns if the agent has reached his this.target
    targetReached() {
        let d = p5.Vector.dist(this.pos, this.target);
        return (d < 1);
    }
    // applyForce(force) {
    //     // We could add mass here if we want A = F / M
    //     this.acc.add(force);
    // }
    /**
     * The functions below are from Nature of Code
     * Separation and Seek by Daniel Shiffman
     * http://natureofcode.com
     */
    applyBehaviors(agents) {
        let separateForce = separate(agents, this, this.r);
        let seekForce = seek(this);
        separateForce.mult(2.0);
        seekForce.mult(1.5);
        this.acc.add(separateForce);
        this.acc.add(seekForce);
        // applyForce(separateForce);
        // applyForce(seekForce);
    }

}
// Separation
// Method checks for nearby Agents and steers away
function separate(Agents, agent, r) {
    let desiredseparation = r * 1.3;
    let sum = createVector();
    let count = 0;
    // For every boid in the system, check if it's too close
    for (let i = 0; i < Agents.length; i++) {
        let other = Agents[i];
        let d = p5.Vector.dist(agent.pos, other.pos);
        // If the distance is greater than 0 and less than an arbitrary amount (0 when you are yourself)
        if ((d > 0) && (d < desiredseparation)) {
            // Calculate vector pointing away from neighbor
            let diff = p5.Vector.sub(agent.pos, other.pos);
            diff.normalize();
            diff.div(d);        // Weight by distance
            sum.add(diff);
            count++;            // Keep track of how many
        }
    }
    // Average -- divide by how many
    if (count > 0) {
        sum.div(count);
        // Our desired vector is the average scaled to maximum this.speed
        sum.normalize();
        sum.mult(agent.speed);
        // Implement Reynolds: Steering = Desired - this.vel
        sum.sub(agent.vel);
        sum.limit(agent.force);
    }
    return sum;
}

// A method that calculates a steering this.force towards a this.target
// STEER = DESIRED MINUS this.vel
function seek(agent) {
    let desired = p5.Vector.sub(agent.target, agent.pos);  // A vector pointing from the this.pos to the this.target
    // Normalize desired and scale to maximum this.speed
    desired.normalize();
    desired.mult(agent.speed);
    // Steering = Desired minus this.vel
    let steer = p5.Vector.sub(desired, agent.vel);
    steer.limit(agent.force);  // Limit to maximum steering this.force

    return steer;
}
